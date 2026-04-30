---
title: "GRPO on Qwen2.5-1.5B"
excerpt: "Teaching a 1.5B model math reasoning with Group Relative Policy Optimization on GSM8K. +47 pts strict accuracy with LoRA on 8 A4000s."
date: 2025-02-01
github: https://github.com/abhishuoza/GRPO_Qwen
math: true
header:
  teaser: /assets/images/portfolio/grpo-qwen-teaser.png
classes: wide
---

<style>
.layout--single .page__inner-wrap { max-width: 1100px; }

#grpo-plot-wrap {
  margin: 1.2rem 0 2rem;
  border: 1px solid #d8dee7;
  border-radius: 10px;
  padding: 1rem 1rem 0.6rem;
  background: #ffffff;
}
#grpo-plot-canvas { width: 100% !important; height: 360px !important; }
.grpo-plot-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.8rem;
  font-size: 0.85rem;
  color: #374151;
  padding-top: 0.6rem;
  border-top: 1px solid #eef1f5;
  margin-top: 0.6rem;
}
.grpo-plot-controls label {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  padding: 2px 8px; border-radius: 12px; border: 1px solid #e5e7eb;
}
.grpo-plot-controls input[type=checkbox] { accent-color: #7c3aed; }
.grpo-plot-caption {
  font-size: 0.82rem; color: #6b7280; margin: 0.2rem 0 2rem; text-align: center;
}

.grpo-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin: 0.8rem 0 1.4rem;
  font-size: 0.85rem;
}
@media (max-width: 720px) { .grpo-compare { grid-template-columns: 1fr; } }
.grpo-compare > div {
  border: 1px solid #d8dee7;
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  background: #fafbfc;
}
.grpo-compare h4 {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}
.grpo-compare pre {
  margin: 0;
  background: transparent;
  padding: 0;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.45;
}
.grpo-compare .grpo-q {
  grid-column: 1 / -1;
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #5b21b6;
}
.grpo-compare .grpo-ok { border-left: 3px solid #10b981; }
.grpo-compare .grpo-bad { border-left: 3px solid #ef4444; }
.grpo-compare .grpo-meta {
  display: block; margin-top: 0.5rem; font-size: 0.72rem; color: #6b7280;
}
</style>

Training [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) on GSM8K math word problems with Group Relative Policy Optimization (GRPO), the RL technique behind DeepSeek-R1. A LoRA adapter, 8 A4000s split 4/4 between a vLLM generation server and DDP training, 2 epochs: strict accuracy climbs from 1.7% to 48.7%.

| Model | Strict | Lenient |
|---|---|---|
| Qwen2.5-1.5B-Instruct (baseline) | 1.7% | 38.3% |
| + GRPO (ours) | **48.7%** | **55.0%** |
| Δ | **+47.0 pts** | **+16.7 pts** |

Strict counts answers inside `<answer>` tags; lenient falls back to the last number in the output. The baseline mostly knows the math but won't use the required format, so strict is near zero. After training the model reliably emits the XML structure and its math improves on top of that.

## Training dynamics

Training curves pulled from the final checkpoint's `trainer_state.json` (one point every 10 steps, 3,738 total over 2 epochs).

<div id="grpo-plot-wrap">
  <canvas id="grpo-plot-canvas"></canvas>
  <div id="grpo-plot-controls" class="grpo-plot-controls"></div>
</div>
<div class="grpo-plot-caption">Hover for exact values. Toggle series with the chips above.</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
(async function () {
  const resp = await fetch("/assets/data/grpo-training-curves.json");
  const rows = await resp.json();
  const steps = rows.map(r => r.step);

  const series = [
    { key: "reward",       label: "Total reward",          color: "#7c3aed", yAxisID: "y",  shown: true  },
    { key: "correctness",  label: "Correctness reward",    color: "#10b981", yAxisID: "y",  shown: true  },
    { key: "format",       label: "Format reward",         color: "#f59e0b", yAxisID: "y",  shown: true  },
    { key: "int",          label: "Int-in-answer reward",  color: "#ec4899", yAxisID: "y",  shown: false },
    { key: "reward_std",   label: "Reward std",            color: "#6b7280", yAxisID: "y",  shown: false },
    { key: "kl",           label: "KL to base",            color: "#0ea5e9", yAxisID: "y2", shown: true  },
    { key: "loss",         label: "Loss",                  color: "#334155", yAxisID: "y2", shown: false },
  ];

  const datasets = series.map(s => ({
    label: s.label,
    data: rows.map(r => r[s.key]),
    borderColor: s.color,
    backgroundColor: s.color,
    borderWidth: 1.6,
    pointRadius: 0,
    pointHoverRadius: 3,
    tension: 0.15,
    yAxisID: s.yAxisID,
    hidden: !s.shown,
  }));

  const ctx = document.getElementById("grpo-plot-canvas").getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: { labels: steps, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => "step " + items[0].label,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "optimizer step" },
          ticks: { maxTicksLimit: 10, autoSkip: true },
        },
        y: {
          title: { display: true, text: "reward" },
          position: "left",
          suggestedMin: 0,
          suggestedMax: 3,
        },
        y2: {
          title: { display: true, text: "KL / loss" },
          position: "right",
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  const ctrls = document.getElementById("grpo-plot-controls");
  series.forEach((s, i) => {
    const id = "grpo-series-" + i;
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" id="${id}" ${s.shown ? "checked" : ""}>
      <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.color};margin-right:2px;"></span>
      ${s.label}`;
    ctrls.appendChild(label);
    label.querySelector("input").addEventListener("change", e => {
      chart.data.datasets[i].hidden = !e.target.checked;
      chart.update();
    });
  });
})();
</script>

As expected, format reward saturates within a few hundred steps as wrapping the answer in `<reasoning>/<answer>` is the easiest signal to pick up. Correctness creeps up over the full run and is still climbing by epoch 2. KL to the base model stays small ($\beta = 0.01$), so the instruct model's general capabilities survive. Total reward rises from ~0.7 to ~2.5.

## Before and after

Two GSM8K test questions, same greedy-decode settings, run through the baseline model and the GRPO-trained model.

<div class="grpo-compare">
  <div class="grpo-q"><strong>Q1.</strong> James decides to run 3 sprints 3 times a week. He runs 60 meters each sprint. How many total meters does he run a week? <span class="grpo-meta">Ground truth: 540</span></div>
  <div class="grpo-bad"><h4>Baseline (no format tag)</h4><pre>To determine how many total meters James runs in a week, we need to follow these steps:

1. Calculate the number of meters James runs per session.
2. Multiply that by the number of sessions he has.

Step 1: ... 3 × 60 meters = 180 meters.
Step 2: 180 meters/session × 3 sessions/week = 540 meters/week.

The final answer is 540 meters.<span class="grpo-meta">Right answer, no &lt;answer&gt; tag → 0 under strict, 1 under lenient.</span></pre></div>
  <div class="grpo-ok"><h4>Trained</h4><pre>&lt;reasoning&gt;
James runs 3 sprints per day and runs 3 days a week, so he runs a
total of 3 × 3 = 9 sprints in a week.
Each sprint is 60 meters long, so James runs a total of
9 × 60 = 540 meters in a week.
&lt;/reasoning&gt;
&lt;answer&gt;540&lt;/answer&gt;<span class="grpo-meta">Right answer, right format → credit under both.</span></pre></div>

  <div class="grpo-q"><strong>Q2.</strong> Eliza's rate per hour for the first 40 hours is $10. Overtime pay is 1.2× her regular rate. She worked 45 hours this week. What are her earnings? <span class="grpo-meta">Ground truth: 460</span></div>
  <div class="grpo-bad"><h4>Baseline (arithmetic slip)</h4><pre>Regular pay = Regular rate × Hours worked
Regular pay = $10 × 40

Overtime pay = 1.2 × (10 × 40)

Let's perform these calculations:
- Regular pay: $10 × 40 = $40
- Overtime pay: 1.2 × ($10 × 40) = 1.2 × $40 = $48
- Total earnings: $40 + $48 = $88

Therefore, Eliza's total earnings for the week are $88.<span class="grpo-meta">Sets up the right decomposition, then asserts $10 × 40 = $40 and cascades the error downstream. Never separates the 5 overtime hours from the 40 regular ones either.</span></pre></div>
  <div class="grpo-ok"><h4>Trained</h4><pre>&lt;reasoning&gt;
Regular earnings = $10/hour × 40 hours = $400

Overtime hours = 45 − 40 = 5 hours
Overtime pay rate = 1.2 × $10/hour = $12/hour
Overtime earnings = $12/hour × 5 hours = $60

Total earnings = $400 + $60 = $460
&lt;/reasoning&gt;

&lt;answer&gt;460&lt;/answer&gt;<span class="grpo-meta">Correctly separates regular vs overtime hours, keeps its bookkeeping clean, tags the answer.</span></pre></div>
</div>

Q1 is the easy win: baseline knew the answer, just wouldn't tag it. In Q2, the baseline sets up the right decomposition, asserts `$10 × 40 = $40` in the first step, and never recovers; the trained model keeps its steps clear and answers $460. Most of the +16.7 lenient points look like Q2: GRPO pressuring the model to keep its steps clear.

## About this project

Reinforcement learning is an important pillar of ML because you can formulate any problem as an RL problem. Give an agent a way to act, a way to observe, and a scalar reward at the end, and the same algorithm can teach it to balance a cart-pole, [beat Lee Sedol at Go](/portfolio/connect4-alphazero/), stack cups on a table, or solve competition math. The only changes are the policy (an MLP for cart-pole, a 1.5B transformer here) and the reward. This is why marrying it with neural networks (which are basically giant learnable circuits that can represent any algorithm in the Turing sense) has proven to be so powerful.

So much generality comes at the cost of underspecification and the tendency for model collapse. To train models that can be useful beyond toy tasks, you have to deal with exploration cost and reward variance. PPO ([Schulman et al., 2017](https://arxiv.org/abs/1707.06347)) was the main policy-gradient algorithm for a decade. You sample trajectories under the current policy, compute an advantage against a baseline, and take a gradient step *clipped* so the new policy can't stray too far from the old one on any single action. The clip is what made policy gradients stable enough to run for millions of iterations without collapse. PPO is the algorithm inside the original ChatGPT RLHF pipeline.

PPO's baseline comes from a *critic*: a learned value network almost as big as the policy. GRPO ([Shao et al., 2024](https://arxiv.org/abs/2402.03300)) removes the critic. For each prompt, it samples a group of $G$ completions, scores all of them, and uses the group's own mean and std as the baseline, $A_i = (R_i - \text{mean}(R)) / \text{std}(R)$. Above-average completions get pushed up, below-average ones get pushed down, and no second network can drift from the true reward. The PPO clipped ratio and KL-to-base remain:

$$J_{\text{GRPO}}(\theta) = \mathbb{E}_{q \sim D,\, \{o_i\} \sim \pi_{\theta_{\text{old}}}}\!\left[\frac{1}{G}\sum_{i=1}^{G} \min\!\left(r_i(\theta)\, A_i,\; \text{clip}\!\left(r_i(\theta), 1\pm\epsilon\right) A_i\right)\right] - \beta\, D_{\text{KL}}(\pi_\theta \Vert \pi_{\text{ref}})$$

with $r_i(\theta) = \pi_\theta(o_i \mid q) / \pi_{\theta_{\text{old}}}(o_i \mid q)$.

This takes away the rest of the old RLHF stack as well, no learned reward model means there is no preference data to collect. All you need to do is sample completions, check them with a verifier, and update. The verifier can be anything deterministic, eg. a math checker, a unit-test runner, a theorem prover or a compiler. DeepSeek-R1 ([DeepSeek-AI, 2025](https://arxiv.org/abs/2501.12948)) scaled this loop into a reasoning model competitive with the strongest frontier models in early 2025. This project is the miniature version I created to wrap my head around this loop.

We see so many tasks out there that don't have fully deterministic rewards but are still very specific; humans can clearly tell right from wrong for them. This gives me a feeling that future AI will involve creating complex yet robust reward models, alongside specific RL algorithms designed to learn well from such reward models.

## Setup

| Component | Details |
|---|---|
| Model | Qwen2.5-1.5B-Instruct, LoRA (rank 16, alpha 32) on q/k/v/o projections |
| Algorithm | GRPO via [TRL's GRPOTrainer](https://huggingface.co/docs/trl/main/en/grpo_trainer) |
| Dataset | GSM8K train split (7,473 examples, 2 epochs) |
| Rewards | Correctness (weight 2.0): full credit for match inside `<answer>`, 0.5 for match as last number. Format (0.5): valid `<reasoning>/<answer>` structure. Int (0.5): extracted answer parses as a number. |
| KL penalty | $\beta = 0.01$ |
| Optimizer | PagedAdamW 8-bit, cosine LR, 10% warmup, weight decay 0.1 |
| Effective batch | 2 × 8 generations × 4 accumulation = 64 |
| Hardware | 8× RTX A4000 (16GB) — 4 for vLLM generation, 4 for DDP training |

We tell ourselves we understand something just by reading it, but there's truly no substitution to implementing something. One simple thing I learned was to use vLLM as a separate generation server. When doing online RL on LLMs, sampling is the true bottleneck, not the gradient step. Every optimizer step needs $G = 8$ completions per prompt and completions take hundreds of sequential steps, which dwarfs the training compute. TRL [supports](https://huggingface.co/docs/trl/main/en/speeding_up_training#vllm-for-fast-generation-in-online-methods) running vLLM on dedicated GPUs as an HTTP sampling server with hot-reloaded policy weights, here 4 A4000s are serving and 4 are doing DDP.

## Takeaways

Most of the 47-point strict delta is format compliance. The +16.7 lenient delta is the honest "did math reasoning improve" number, still substantial for 1.5B parameters on two epochs of 7.5k examples. Bigger gains would want a bigger base model and longer generations for multi-step scratch work, but as a proof that GRPO runs on commodity GPUs with no reward model and no preference data, pretty encouraging. It's also just cool that I can teach an AI how to do math in English, like wtf we are literally living in the future.

## Resources

**Papers**

- Shao, Z., Wang, P., Zhu, Q., Xu, R., Song, J., Zhang, M., Li, Y., Wu, Y., & Guo, D. (2024). [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300). Introduces GRPO.
- DeepSeek-AI. (2025). [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948). The GRPO-at-scale result that sparked the wider interest.
- Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O. (2017). [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347). Proposed PPO, what GRPO builds on.
- Cobbe, K., Kosaraju, V., Bavarian, M., Chen, M., Jun, H., Kaiser, L., Plappert, M., Tworek, J., Hilton, J., Nakano, R., Hesse, C., & Schulman, J. (2021). [Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168). The GSM8K dataset.

**Explainers**

- [RL By The Book](https://youtube.com/playlist?list=PLzvYlJMoZ02Dxtwe-MmH4nOB5jYlMGBjr) (Mutual Information). A dense walkthrough of RL, a great resource.
- [PPO explainer](https://youtu.be/8jtAzxUwDj0) (Julia Turc).
- [GRPO explainer](https://youtu.be/xT4jxQUl0X8) (Julia Turc).

**Libraries**

- [TRL](https://github.com/huggingface/trl). `GRPOTrainer` does the heavy lifting here.
- [PEFT](https://github.com/huggingface/peft). LoRA adapters.
- [vLLM](https://github.com/vllm-project/vllm). Fast generation server for the sampling-heavy inner loop.
- [bitsandbytes](https://github.com/bitsandbytes-foundation/bitsandbytes). 8-bit optimizer.
