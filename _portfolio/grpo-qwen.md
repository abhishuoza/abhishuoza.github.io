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

Training [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) on GSM8K math word problems with Group Relative Policy Optimization (GRPO), the RL technique behind DeepSeek-R1. With a LoRA adapter on 8 A4000 GPUs (4 running a vLLM generation server, 4 doing DDP training), strict accuracy goes from 1.7% to 48.7% in 2 epochs.

| Model | Strict | Lenient |
|---|---|---|
| Qwen2.5-1.5B-Instruct (baseline) | 1.7% | 38.3% |
| + GRPO (ours) | **48.7%** | **55.0%** |
| Δ | **+47.0 pts** | **+16.7 pts** |

Strict counts only answers inside `<answer>` tags; lenient falls back to the last number in the output. The baseline mostly knows the math, it just doesn't use the required format, so its strict score is near zero even though its lenient is respectable. After training, the model reliably emits the `<reasoning>/<answer>` XML structure, and its math improves meaningfully on top of that.

## Training dynamics

Below are the training curves, pulled from the final checkpoint's `trainer_state.json` (one point every 10 optimizer steps, 3,738 total over 2 epochs).

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

The format reward climbs fastest. Within the first few hundred steps the model has already figured out that wrapping its answer in `<reasoning>/<answer>` is a reliable source of signal, and that component saturates near 0.9. Correctness creeps up more slowly: it takes the full first epoch to get above 0.5 and continues improving through epoch 2. KL divergence from the base model stays small (beta = 0.01 is a deliberately light leash on a 1.5B model), which matters because we want to preserve the instruct model's general capabilities rather than overwrite them. Total reward (the three components weighted 2.0 / 0.5 / 0.5) rises from ~0.7 to ~2.5.

## Before and after

Same three GSM8K test questions, same greedy-decode settings, run through the baseline model and the GRPO-trained model.

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

  <div class="grpo-q"><strong>Q2.</strong> A robe takes 2 bolts of blue fiber and half that much white fiber. How many bolts in total does it take? <span class="grpo-meta">Ground truth: 3</span></div>
  <div class="grpo-ok"><h4>Baseline</h4><pre>... Half of 2 bolts is 1 bolt.
Blue fiber: 2 bolts
White fiber: 1 bolt
Total bolts = 2 + 1 = 3 bolts

Therefore, the total number of bolts needed is 3.

&lt;answer&gt;3&lt;/answer&gt;<span class="grpo-meta">Accidentally emits the tag. Easy problem, both models get it.</span></pre></div>
  <div class="grpo-ok"><h4>Trained</h4><pre>&lt;reasoning&gt;
The robe requires 2 bolts of blue fiber.
It also requires half that amount of white fiber, which is 1 bolt
(half of 2).
Therefore, the total number of bolts required is 2 + 1 = 3.
&lt;/reasoning&gt;
&lt;answer&gt;3&lt;/answer&gt;<span class="grpo-meta">Tighter, no preamble.</span></pre></div>

  <div class="grpo-q"><strong>Q3.</strong> One glass costs $5; every second glass costs 60% of that. Kylar buys 16. What does he pay? <span class="grpo-meta">Ground truth: 64</span></div>
  <div class="grpo-bad"><h4>Baseline (catastrophic loop)</h4><pre>... Price per additional glass = $5 × 3/5 = $3
Total cost for additional glasses = 8 × $3 = $24

Now, adding the cost of all 16 glasses together:
\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \
\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \
[... repeats until max_new_tokens]<span class="grpo-meta">Correct math at the top, then falls into a LaTeX whitespace loop and never emits an answer. A classic small-model failure mode.</span></pre></div>
  <div class="grpo-bad"><h4>Trained (clean format, wrong math)</h4><pre>&lt;reasoning&gt;
The cost of each glass is $5.
Every second glass costs 60% of the price, so it costs
0.6 × $5 = $3.
Kylar wants to buy 16 glasses in total.
So, the total cost will be 16 × ($5 + 0.6 × $5).
&lt;/reasoning&gt;
(16) × ($5 + 0.6 × $5) = 280

Therefore, Kylar needs to pay $280 for the glasses.
&lt;answer&gt;280&lt;/answer&gt;<span class="grpo-meta">Format is pristine; the algebra treats every glass as a 60%-glass instead of every second one. Still wrong, but now wrong in a way a human can spot.</span></pre></div>

  <div class="grpo-q"><strong>Q4.</strong> Eliza's rate per hour for the first 40 hours is $10. Overtime pay is 1.2× her regular rate. She worked 45 hours this week. What are her earnings? <span class="grpo-meta">Ground truth: 460</span></div>
  <div class="grpo-bad"><h4>Baseline (arithmetic slip)</h4><pre>Regular pay = Regular rate × Hours worked
Regular pay = $10 × 40

Overtime pay = 1.2 × (10 × 40)

Let's perform these calculations:
- Regular pay: $10 × 40 = $40
- Overtime pay: 1.2 × ($10 × 40) = 1.2 × $40 = $48
- Total earnings: $40 + $48 = $88

Therefore, Eliza's total earnings for the week are $88.<span class="grpo-meta">Sets up the right decomposition, then asserts $10 × 40 = $40 and everything downstream is wrong. Also never separates the 5 overtime hours from the 40 regular ones.</span></pre></div>
  <div class="grpo-ok"><h4>Trained</h4><pre>&lt;reasoning&gt;
Regular earnings = $10/hour × 40 hours = $400

Overtime hours = 45 − 40 = 5 hours
Overtime pay rate = 1.2 × $10/hour = $12/hour
Overtime earnings = $12/hour × 5 hours = $60

Total earnings = $400 + $60 = $460
&lt;/reasoning&gt;

&lt;answer&gt;460&lt;/answer&gt;<span class="grpo-meta">Correctly separates regular vs overtime hours, gets the arithmetic right, tags the answer.</span></pre></div>
</div>

Q3 and Q4 together are the honest picture. Q3 shows the baseline collapsing into a token-level loop while the trained model stays coherent and produces a clean tagged answer (even when its algebra is off); Q4 shows a case where GRPO genuinely lifted the model's reasoning quality and the trained output is a strict win over the baseline. GRPO at 1.5B teaches structure and stability first, and on top of that stability it also moves the needle on math — the lenient delta of +16.7 pts is made up of wins like Q4.

## GRPO in one paragraph

GRPO ([Shao et al., 2024](https://arxiv.org/abs/2402.03300)) removes the reward model from PPO. For each prompt in a batch, you sample a group of $G$ completions from the current policy. Each completion gets a scalar reward (here, a weighted sum of three rule-based functions: correctness, format, int-in-answer). Advantages are computed relative to the *group* mean and std, so the update pushes above-average completions up and below-average completions down, with no separate value network. A KL penalty to the base model prevents catastrophic drift. Formally:

$$J_{\text{GRPO}}(\theta) = \mathbb{E}_{q \sim D,\, \{o_i\}_{i=1}^{G} \sim \pi_{\theta_{\text{old}}}}\!\left[\frac{1}{G}\sum_{i=1}^{G} \min\!\left(r_i(\theta)\, A_i,\; \text{clip}\!\left(r_i(\theta), 1\pm\epsilon\right) A_i\right)\right] - \beta\, D_{\text{KL}}(\pi_\theta \Vert \pi_{\text{ref}})$$

where $r_i(\theta) = \pi_\theta(o_i \mid q) / \pi_{\theta_{\text{old}}}(o_i \mid q)$ and $A_i = (R_i - \text{mean}(R)) / \text{std}(R)$ is the group-normalized advantage. The PPO-style clipped ratio keeps updates conservative per step.

This plays well with rule-based rewards for tasks that have a verifier: math (check the number), code (run the tests), constrained generation (check the grammar). No reward model to train, no preference data to collect.

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

Two operational notes worth calling out:

**vLLM as a separate generation server.** GRPO's bottleneck is autoregressive sampling, not the gradient step: every optimizer step needs $G = 8$ completions per prompt, which dwarfs the training compute. TRL supports ([docs](https://huggingface.co/docs/trl/main/en/speeding_up_training#vllm-for-fast-generation-in-online-methods)) running vLLM on a dedicated set of GPUs as an HTTP server that the trainer hits for sampling. On the iLab cluster this meant 4 A4000s running `trl vllm-serve` with the current policy weights hot-reloaded, and 4 others running `accelerate launch` with DDP. Without this split, wall-clock per step was dominated by the sampler.

**LoRA instead of full fine-tuning.** The adapter is 17 MB and trains in bf16. The base model stays frozen, which means the KL-to-base term is computed against weights we're guaranteed to still have, and the adapter can be turned off at inference if we want the original model back. On consumer GPUs a rank-16 LoRA is also the difference between "fits on one card" and "doesn't fit."

## Takeaways

The biggest jump here (1.7% → 48.7% strict, a 47-point delta) is almost entirely format compliance. The lenient-accuracy delta is the more honest measurement of "did the model get smarter at math," and it's +16.7 points, which is still substantial for a 1.5B model trained for two epochs on 7.5k examples. For bigger wins you'd want a bigger base model, longer generations that allow real multi-step scratch work, and probably curriculum over problem difficulty. But as a proof that GRPO works at small scale on commodity GPUs, with no reward model and no preference data, this is encouraging.

## Resources

**Papers**

- Shao, Z., Wang, P., Zhu, Q., Xu, R., Song, J., Zhang, M., Li, Y., Wu, Y., & Guo, D. (2024). [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300). Introduces GRPO.
- DeepSeek-AI. (2025). [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948). The GRPO-at-scale result that sparked the wider interest.
- Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O. (2017). [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347). The PPO backbone GRPO builds on.
- Cobbe, K., Kosaraju, V., Bavarian, M., Chen, M., Jun, H., Kaiser, L., Plappert, M., Tworek, J., Hilton, J., Nakano, R., Hesse, C., & Schulman, J. (2021). [Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168). The GSM8K dataset.

**Libraries**

- [TRL](https://github.com/huggingface/trl). `GRPOTrainer` does the heavy lifting here.
- [PEFT](https://github.com/huggingface/peft). LoRA adapters.
- [vLLM](https://github.com/vllm-project/vllm). Fast generation server for the sampling-heavy inner loop.
- [bitsandbytes](https://github.com/bitsandbytes-foundation/bitsandbytes). 8-bit optimizer.
