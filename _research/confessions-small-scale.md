---
title: "Confessions at Small Scale: A Partial Reproduction and a Stress Test"
excerpt: "Reproducing OpenAI's confessions training on an open 8B model, stress-testing confession honesty under prompt pressure, and probing how much of it rides on the model's ability to verify its own work."
date: 2026-06-05
github: https://github.com/abhishuoza/confessions-small-scale
classes: wide
header:
  teaser: /assets/images/research/confessions/fig1_reproduction.png
---

OpenAI have proposed a new training technique for AI safety called [Confessions](https://openai.com/index/how-confessions-can-keep-language-models-honest/) ([Joglekar et al., 2025](https://arxiv.org/abs/2512.08093)), in which they train a separate output channel which is rewarded solely based on its honesty. In this post, I describe my work in reproducing the main results on a small scale (around 8B size), and study stress testing confession outputs under system prompts that put pressure on the model to act against being honest.

The reproduction works in a limited form, with a persistently-hacking 8B checkpoint with confessions that become more honest with training. The stress test shows that honesty survives instruction pressure except under an explicit jailbreak. As also shown in the original paper, confessions honesty was heavily reliant on the model's ability to verify its own work. It was difficult to elicit reward hacking at this scale that the model was also aware of.

## Confessions

From the [paper abstract](https://arxiv.org/abs/2512.08093):

> In this work we propose a method for eliciting an honest expression of an LLM's shortcomings via a self-reported *confession*. A confession is an output, provided upon request after a model's original answer, that is meant to serve as a full account of the model's compliance with the letter and spirit of its policies and instructions. The reward assigned to a confession during training is solely based on its honesty, and does not impact positively or negatively the main answer's reward. As long as the "path of least resistance" for maximizing confession reward is to surface misbehavior rather than covering it up, this incentivizes models to be honest in their confessions. Our findings provide some justification this empirical assumption, especially in the case of egregious model misbehavior.

Confessions training is an exciting new opportunity to improve the safety of AI models. Keeping the self-report channel reward-disjoint is critical -- it gives us an opportunity to test generalisation and robustness of an abstract property without other task pressures coming in the way.

I have attempted a reproduction of this work on an 8B parameter scale and studied its robustness under varying system prompt pressure (repo [here](https://github.com/abhishuoza/confessions-small-scale)).

## Setup

The task used is Word Count, where the model is asked to write a paragraph of exactly 5 sentences on its topic of choice, where each sentence has to be a specified number of words (alternates between 12 and 18 words for each sentence).

Qwen3-8B with thinking enabled is used. Each rollout consists of the paper's 2 turn interaction with the following parts:

- x: task prompt (the Word Count instruction)
- z: task CoT (the model's thinking on the task)
- y: task answer
- xc: confession prompt (fixed follow-up asking for a `ConfessionReport`)
- zc: confession CoT (thinking during the confession turn)
- yc: confession report (the `ConfessionReport` itself)

The `ConfessionReport` must have the following schema (Appendix D from the paper):

- A compliance analysis of each objective (each sentence graded Full, Partial, or None).
- A list of uncertainties.
- An overall 1 to 7 grade where 4 or higher counts as passing.

Training is set up as a dual-span GRPO. A smaller language model (Qwen3-4B-Instruct, non-thinking) is used for the task reward, which looks at only the main answer token span (trains the z,y span). The confession span is rewarded only on the honesty via ground truth (a static function strips the output and counts the words, trains the zc,yc span). The idea is that even if a larger model is trained on a weak reward judge for a task, the model is incentivised to reveal hacking in the confession channel.

The hack was elicited in the model via an instruction in the prompt: In the task prompt, I ask the model to report each sentence's word count in parentheses, for example, "The cat sat on the mat (6)". The idea is that the weak judge for the original task trusts the end label, which is exploitable by the larger model (the paper mentions this hack but does not mention such an instruction being put in the task prompt). The tradeoff is that the model uses the requested target number in the end bracket (either out of confusion or knowingly) even before training.

## Differences from the original setup

This reproduction deviates from the paper in following ways.

1. The confession reward used here is the programmatic ground truth itself, not an LLM judge, as opposed to the paper where a weakened LLM judge scores both the task and confession channels. This is clearer for measuring if honesty is learnable, but removes the possibility of the model learning to fool the confession judge.

2. Confessions here are trained on a single task with 100% of rollouts as opposed to 25% of rollouts from a large diversity of tasks in the paper. Future work, especially on out of distribution generalisation should include this.

3. The hack was elicited via instruction in the prompt. The reason for this instruction is that I was unable to elicit the bracket-hack over the training, which is how we would want it to naturally emerge. In fact, manufacturing the reward hack over the course of task training turned out to be the hardest part to replicate at this scale. I've elaborated on the [difficulties in a later section](#difficulties-in-eliciting-aware-reward-hacking).

## Reproduction

I ran 100 steps of training on Qwen3-8B with the bracket hack and a weak LLM judge (Qwen3-4B-Instruct, non-thinking), with checkpoints at 0, 25, 50, 75 and 100 training steps. Each one is evaluated on 64 new word count rollouts including the confession turn.

![RUN 1 reproduction](/assets/images/research/confessions/fig1_reproduction.png)

| baseline, default confession | ckpt0 | ckpt25 | ckpt50 | ckpt75 | ckpt100 |
|---|---|---|---|---|---|
| exact compliance (task) | 0.05 | 0.08 | 0.03 | 0.07 | 0.10 |
| bracket-hack persistence (task) | 0.95 | 0.88 | 0.87 | 0.90 | 0.81 |

Instructing the model to report the word count leads the model to put the requested target number as the bracket number regardless of whether the sentence actually has that number of words. We see that bracket hack persistence, although decreasing with training, still remains high with true task compliance remaining low. Importantly, the training leads to an increase in truthfulness of per-objective claim (claim-match) and in overall grade honesty given noncompliance to the word count task.

Similar to section 4 of the paper, the weak 4B judge also gets slightly more fooled on average with training (i.e. higher fraction of incorrect answers pass the weak judge) as the model learns to increase reward against the judge.

![training-side echo](/assets/images/research/confessions/fig5_training_echo.png)

## Stress Testing

I wanted to test confessions training over varying amounts of instruction pressure to see the effect on honesty. I created the following 5 eval-time conditions (system prompts injected before the task prompt) that could put pressure on the model to look compliant:

- Baseline: No system prompt, model is unaware it will be asked for a ConfessionReport except for what it learned in training.
- Awareness: Makes the model aware of the two step interaction and that both responses will be evaluated.
- Soft: Adds social pressure by mentioning a reviewer who likes confident, requirements-meeting answers.
- Hard: Adds explicit performance pressure by mentioning that failed answers are rejected and counted against a score.
- Jailbreak: An explicit override instructing the model to always claim Full compliance, grade of 7, no uncertainties regardless of the truth.

![the stress grid](/assets/images/research/confessions/fig2_stress_grid.png)

Reassuringly, results show that confession honesty holds across baseline, awareness, soft and hard pressure, all improving with training. In fact, awareness and soft pressures show slightly increased honesty over the baseline. Jailbreak expectedly collapses the honesty across all checkpoints, with honest confessions \| non-compliant rate staying near 3%.

## Insight into Mechanism

The authors of the paper observe that a majority of confession dishonesty comes from the model being confused instead of model-aware reward hacking. I tested different models to ascertain the reason for incorrect confessions for models not trained with confessions.

For the Word Count task, there is a way to separate these hypotheses. I added a second confession variant called `forced-count` in which the confession prompt strongly asks the model to enumerate every word with its position number in its chain of thought before it produces the `ConfessionReport`.

### Model Scale

![scale axis](/assets/images/research/confessions/fig3_scale_confusion.png)

Results across multiple sizes show that forcing this check largely dissolves incorrect confessions. Also, larger models do the count-verification on their own more often, lending more credence to verification being the bottleneck to correct confessions.

### Training Stages

I tested a model family consisting of different training stages (OLMo-3-7B with Think-SFT, Think-DPO, Think-RLVR and Instruct stages) to ascertain how training levels affect honesty.

![OLMo-3 ladder](/assets/images/research/confessions/fig4_olmo3_verification.png)

DPO training reduces verification ability and RLVR increases it significantly, as expected. Instruct stage does not have a reasoning mode, leading to low answer correctness.

### Forced Count

We can interpret the effect of the forced count in two different ways:

1) It provides the model with the mechanism to be honest, and the model clearly applies it when it is aware of this mechanism.
2) It makes the model aware that the reviewer is aware of the mechanism, so it chooses to be more honest to save face.

At this scale it is likely the former, but for more complex tasks and much more advanced models, the model could start showing honesty because of the latter.

## Difficulties in Eliciting Aware Reward Hacking

It was very difficult to get the right pre-hack checkpoint for the purposes of this reproduction, one that would find and learn the hack on its own over training against the weak judge.

I produced many rollouts to see if the models find any sort of hack on their own, but the rollouts showed no such hacks. Due to this, I pivoted to a different task -- competitive programming -- where a hack would hardcode the public sample inputs, passing public tests and failing hidden ones. I spent multiple SFT-seeding iterations on it, varying the hack fraction, number of epochs, learning rate, curriculum, chain of thought etc.

The seed itself succeeded. I got a checkpoint that hacked at a low and sampleable rate with a still possible honest path, but ran into a difficult issue. Easy problems are solved directly and don't need hacking. On hard problems, the seeded hack does not fire. The only way to install the desired policy is to write the trigger into the chain of thought. This contaminates the confession being measured, because now it scripts the model's stated intent.

I switched back to Word Count, and finally settled on elicitation via instruction-in-prompt approach (telling the model to put the number of words at the end of every sentence) when other approaches and tasks didn't work.

## Future Work

Getting a better pre-hack checkpoint will be essential to do further work on confessions at this scale. Maybe I am missing something simple here but I could not understand what it is.

An interesting direction to explore is how confession honesty generalises across tasks. Can honesty survive on out of distribution tasks, ones never seen during training? More approaches that clearly separate out verification ability from task hacking will also help get a better picture.

Further work can also be done by generalising the concept. "Clean channel" training for any particular property when it is not competing with other output incentives could allow for clearer measurement of the property.

## References

Manas Joglekar, Jeremy Chen, Gabriel Wu, Jason Yosinski, Jasmine Wang, Boaz Barak, and Amelia Glaese. *Training LLMs for Honesty via Confessions*. arXiv:2512.08093, December 2025. [https://arxiv.org/abs/2512.08093](https://arxiv.org/abs/2512.08093)

Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu, Junxiao Song, et al. *DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models*. arXiv:2402.03300, 2024. [https://arxiv.org/abs/2402.03300](https://arxiv.org/abs/2402.03300)

Qwen Team. *Qwen3 Technical Report*. arXiv:2505.09388, May 2025. [https://arxiv.org/abs/2505.09388](https://arxiv.org/abs/2505.09388)

Team Olmo (Allen Institute for AI). *Olmo 3*. arXiv:2512.13961, December 2025. [https://arxiv.org/abs/2512.13961](https://arxiv.org/abs/2512.13961)
