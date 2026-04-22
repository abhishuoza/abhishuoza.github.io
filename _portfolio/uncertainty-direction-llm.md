---
title: "Looking for an Uncertainty Direction in GPT-2"
excerpt: "A mechanistic interpretability attempt to find a linear direction in activation space that encodes uncertainty. A null result, visualized."
date: 2024-12-01
github: https://github.com/abhishuoza/uncertainty-direction-llm
math: true
header:
  teaser: /assets/images/portfolio/uncertainty-llm-teaser.png
classes: wide
---

<style>
.layout--single .page__inner-wrap { max-width: 1100px; }

.udl-callout {
  background: #fef3c7;
  border-left: 4px solid #d97706;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  margin: 1rem 0 1.5rem;
  font-size: 0.92rem;
}
.udl-callout strong { color: #92400e; }

.udl-demo {
  margin: 1.2rem 0 2rem;
  border: 1px solid #d8dee7;
  border-radius: 10px;
  padding: 1rem;
  background: #ffffff;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
  gap: 1.2rem;
}
@media (max-width: 820px) { .udl-demo { grid-template-columns: 1fr; } }

.udl-plot-col { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
#udl-canvas {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 480px;
  background: #fafbfc;
  border: 1px solid #eef1f5;
  border-radius: 6px;
  display: block;
}

.udl-legend {
  display: flex; flex-wrap: wrap; gap: 0.3rem 0.6rem;
  font-size: 0.82rem; color: #374151;
}
.udl-legend label {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
  padding: 2px 8px; border-radius: 12px; border: 1px solid #e5e7eb;
  user-select: none;
}
.udl-legend input[type=checkbox] { accent-color: #7c3aed; margin: 0; }
.udl-legend .udl-dot {
  width: 10px; height: 10px; border-radius: 50%; display: inline-block;
}

.udl-hover {
  font-size: 0.82rem; color: #374151; min-height: 3.4em;
  background: #f9fafb; border: 1px solid #eef1f5; border-radius: 6px;
  padding: 0.5rem 0.7rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.45; white-space: pre-wrap;
}

.udl-side { display: flex; flex-direction: column; gap: 0.8rem; font-size: 0.85rem; }
.udl-side h4 {
  margin: 0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}
.udl-side .udl-direction-card {
  border: 1px solid #eef1f5;
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  background: #fafbfc;
}
.udl-side .udl-direction-card .udl-desc {
  color: #6b7280; font-size: 0.78rem; margin: 0.2rem 0 0.4rem; line-height: 1.4;
}
.udl-side .udl-tokens { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78rem; color: #1f2937; line-height: 1.5; }
.udl-side .udl-tokens b { color: #6b7280; font-weight: 600; font-family: inherit; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin: 0.3rem 0 0.15rem; }
.udl-side .udl-token-pill {
  display: inline-block; padding: 1px 6px; margin: 1px 2px 1px 0;
  border-radius: 10px; background: #eef2ff; border: 1px solid #e0e7ff; color: #3730a3;
  white-space: pre;
}
.udl-side .udl-token-pill.neg { background: #fef2f2; border-color: #fee2e2; color: #991b1b; }

.udl-axis-picker { font-size: 0.82rem; color: #374151; }
.udl-axis-picker select { font-size: 0.82rem; padding: 1px 4px; }
</style>

The hypothesis is clean: if you could find a single direction $v$ in a language model's residual stream such that pushing activations along $v$ reliably made the model more or less uncertain about its next-token prediction, you'd have a concrete handle on a high-level property of model behavior. Prior work has found directions that appear to encode gender, sentiment, refusal, and truthfulness this way, by taking the mean activation difference between two curated prompt sets. This project tried the same recipe for uncertainty on GPT-2 small. It didn't work, and the interactive plot below shows exactly why.

<div class="udl-callout">
<strong>TL;DR — null result.</strong> Mean activation differences between "confident" and "uncertain" prompt sets yield directions, but those directions encode whatever surface feature varied between the sets (semantic category, sentence structure, numeric content), not an abstract concept of uncertainty. Even carefully structure-matched prompts didn't isolate uncertainty cleanly. Presenting this as a reminder that the contrastive-direction recipe only works when you can actually control confounds, and that abstract cognitive properties may not live on simple linear axes.
</div>

## Interactive demo

Each dot below is one prompt, positioned by the projection of its final-layer residual stream (at the last token) onto two candidate "uncertainty directions." Hover a dot to see the prompt. Toggle groups with the legend.

<div class="udl-demo">
  <div class="udl-plot-col">
    <canvas id="udl-canvas"></canvas>
    <div class="udl-axis-picker">
      <label>x-axis: <select id="udl-x"></select></label>
      &nbsp;&nbsp;
      <label>y-axis: <select id="udl-y"></select></label>
    </div>
    <div class="udl-legend" id="udl-legend"></div>
    <div class="udl-hover" id="udl-hover">Hover a dot to see the prompt.</div>
  </div>

  <div class="udl-side" id="udl-side"></div>
</div>

<script>
(async function () {
  const resp = await fetch("/assets/data/uncertainty-vectors.json");
  const data = await resp.json();

  const groupColors = ["#2563eb", "#dc2626", "#059669", "#d97706"];
  const axes = [
    { key: "factual", label: "Factual-uncertainty direction (x)" },
    { key: "seq",     label: "Random-order direction (y)" },
  ];

  // axis pickers
  const xSel = document.getElementById("udl-x");
  const ySel = document.getElementById("udl-y");
  axes.forEach((a, i) => {
    xSel.add(new Option(a.label, a.key, i === 0, i === 0));
    ySel.add(new Option(a.label, a.key, i === 1, i === 1));
  });

  // build a flat list of points
  const points = [];
  data.groups.forEach((g, gi) => {
    g.prompts.forEach((p, pi) => {
      points.push({
        group: gi,
        groupName: g.name,
        prompt: p,
        factual: g.projections.factual[pi],
        seq: g.projections.seq[pi],
      });
    });
  });

  const visible = data.groups.map(() => true);

  // legend
  const legendEl = document.getElementById("udl-legend");
  data.groups.forEach((g, i) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" checked>
      <span class="udl-dot" style="background:${groupColors[i]}"></span>${g.name}`;
    legendEl.appendChild(label);
    label.querySelector("input").addEventListener("change", e => {
      visible[i] = e.target.checked;
      draw();
    });
  });

  // side panel: unembedding tokens for each direction
  const sideEl = document.getElementById("udl-side");
  data.directions.forEach(d => {
    const card = document.createElement("div");
    card.className = "udl-direction-card";
    const top = d.top_tokens.slice(0, 12).map(t =>
      `<span class="udl-token-pill">${escapeHtml(t.token)}</span>`
    ).join("");
    const bot = d.bottom_tokens.slice(0, 8).map(t =>
      `<span class="udl-token-pill neg">${escapeHtml(t.token)}</span>`
    ).join("");
    card.innerHTML = `
      <h4>${escapeHtml(d.name)}</h4>
      <div class="udl-desc">${escapeHtml(d.description)}</div>
      <div class="udl-tokens">
        <b>Points toward</b>${top}
        <b>Points away from</b>${bot}
      </div>`;
    sideEl.appendChild(card);
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  }

  const canvas = document.getElementById("udl-canvas");
  const ctx = canvas.getContext("2d");
  const hoverEl = document.getElementById("udl-hover");

  let layout = null;
  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    fitCanvas();
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const xKey = xSel.value, yKey = ySel.value;
    const active = points.filter(p => visible[p.group]);
    if (active.length === 0) { layout = null; return; }

    const xs = active.map(p => p[xKey]);
    const ys = active.map(p => p[yKey]);
    const pad = 0.08;
    let xmin = Math.min(...xs), xmax = Math.max(...xs);
    let ymin = Math.min(...ys), ymax = Math.max(...ys);
    const xr = (xmax - xmin) || 1, yr = (ymax - ymin) || 1;
    xmin -= xr * pad; xmax += xr * pad;
    ymin -= yr * pad; ymax += yr * pad;

    const margin = { l: 54, r: 14, t: 14, b: 40 };
    const plotW = W - margin.l - margin.r;
    const plotH = H - margin.t - margin.b;

    const sx = v => margin.l + ((v - xmin) / (xmax - xmin)) * plotW;
    const sy = v => margin.t + plotH - ((v - ymin) / (ymax - ymin)) * plotH;

    // axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.l, margin.t, plotW, plotH);

    // zero lines if in range
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#d1d5db";
    if (xmin < 0 && xmax > 0) {
      const x0 = sx(0);
      ctx.beginPath(); ctx.moveTo(x0, margin.t); ctx.lineTo(x0, margin.t + plotH); ctx.stroke();
    }
    if (ymin < 0 && ymax > 0) {
      const y0 = sy(0);
      ctx.beginPath(); ctx.moveTo(margin.l, y0); ctx.lineTo(margin.l + plotW, y0); ctx.stroke();
    }
    ctx.setLineDash([]);

    // tick labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i++) {
      const v = xmin + (i / 4) * (xmax - xmin);
      const x = margin.l + (i / 4) * plotW;
      ctx.fillText(v.toFixed(1), x, margin.t + plotH + 4);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = ymin + (i / 4) * (ymax - ymin);
      const y = margin.t + plotH - (i / 4) * plotH;
      ctx.fillText(v.toFixed(1), margin.l - 6, y);
    }

    // axis labels
    ctx.fillStyle = "#374151";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    const xLabel = axes.find(a => a.key === xKey).label.replace(" (x)", "").replace(" (y)", "");
    const yLabel = axes.find(a => a.key === yKey).label.replace(" (x)", "").replace(" (y)", "");
    ctx.fillText(xLabel, margin.l + plotW / 2, H - 6);
    ctx.save();
    ctx.translate(14, margin.t + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // points
    const screenPoints = [];
    active.forEach(p => {
      const x = sx(p[xKey]), y = sy(p[yKey]);
      screenPoints.push({ x, y, p });
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = groupColors[p.group] + "cc";
      ctx.fill();
      ctx.strokeStyle = groupColors[p.group];
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    layout = { screenPoints, xKey, yKey };
  }

  function handleMove(evt) {
    if (!layout) return;
    const rect = canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    let closest = null, bestD = 100;
    for (const sp of layout.screenPoints) {
      const d = (sp.x - mx) ** 2 + (sp.y - my) ** 2;
      if (d < bestD) { bestD = d; closest = sp; }
    }
    if (closest) {
      hoverEl.textContent =
        `[${closest.p.groupName}] ${closest.p.prompt}\n` +
        `factual=${closest.p.factual.toFixed(2)}   seq=${closest.p.seq.toFixed(2)}`;
    } else {
      hoverEl.textContent = "Hover a dot to see the prompt.";
    }
  }
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseleave", () => {
    hoverEl.textContent = "Hover a dot to see the prompt.";
  });

  xSel.addEventListener("change", draw);
  ySel.addEventListener("change", draw);
  window.addEventListener("resize", draw);
  draw();
})();
</script>

The demo loads four prompt groups from the final iteration of the experiment, 133 prompts total, pushed through GPT-2 small. The two axes are the two candidate "uncertainty directions," each computed the standard way: mean activation of the uncertain set minus mean activation of the confident set, then normalized to a unit vector. Both directions separate *their own* training sets well. That's just the mean-difference construction doing its job. The interesting question is whether either direction *generalizes* as a representation of uncertainty.

The side panel shows what each direction points toward in vocabulary space, obtained by projecting the direction through GPT-2's unembedding matrix $W_U$ and reading off the top-logit tokens. That single view is the whole story in miniature. The "factual-uncertainty direction" points toward tokens like "beet," "carrot," "camel," "rabbit" — which are just common nouns from the *uncertain* prompt set (`"Here are the names of N vegetables: carrot,"`, `"Here are the names of N animals: dog,"`). The "random-order direction" points toward numbers like "2," "23," "3," "283" — the digits that were literally injected into the uncertain prompts in iteration 3 (`"Even numbers: 14, 4, 6,"` vs `"Even numbers: 2, 4, 6,"`). Neither is an abstract uncertainty feature; each is a signature of the surface lexical differences between the two groups it was built from.

## What actually happens

A cleaner description of what the mean-difference construction does: it returns the direction in activation space that best linearly separates the two sample means. If those sample means happen to differ along an abstract feature of interest, that feature will show up in the direction. But if they differ along any other feature — semantic category, punctuation frequency, sentence structure, numeric content — that will show up too, and in practice those features dominate because they produce large, consistent activation patterns while any "uncertainty" signal (if it exists as a linear feature at all) is weaker and less orthogonal.

Three iterations walked through progressively tighter controls:

**Iteration 1** used loosely matched prompts: proper-noun continuations for the confident set (`"President Barack"`) and open-ended list continuations for the uncertain set (`"Here are 5 colors: teal,"`). The direction pointed toward common nouns from the second group, with zero surprise in retrospect.

**Iteration 2** kept both sets in the same list-continuation format but varied the category (colors/animals/vegetables vs. instruments/fruits/birds). The direction still encoded category leakage, just more subtle. Adding a control experiment — pick two differently-categorized lists and compute a "direction" from them — produced something that separated confident from uncertain equally well, proving the first direction wasn't special.

**Iteration 3** (the most controlled attempt) used identical templates with only ordering swapped: `"The days: Monday, Tuesday, Wednesday,"` versus `"The days: Friday, Monday, Wednesday,"`. Same vocabulary, same structure, same category. Only the sequential-vs-random pattern differs. The resulting direction points almost entirely toward random-looking numbers and rare tokens. The model is encoding "does the next token follow a sequence?" rather than anything like "am I uncertain about the next token?"

The intervention experiments (adding $\alpha \cdot v$ to the residual stream and watching the output distribution) were consistent with this reading. Large $\alpha$ did increase entropy and reduced the probability of the original top token, but the new top tokens were the same ones shown in the side panel — vegetables, animals, or random digits — not a coherent "more uncertain" prediction. The intervention was steering the model's output distribution toward a specific lexical set, not toward a more hedged posterior.

## Why this matters

The contrastive-direction recipe is genuinely powerful for some tasks. Gender, sentiment, and refusal directions all tend to replicate, and they're useful for both interpretation and intervention. But this project is a reminder of a sharp precondition: the feature you're trying to isolate has to be the *only* thing your two prompt sets differ on, up to noise. That's feasible for binary features with a natural template swap (`"He is a..."` vs `"She is a..."`), and much harder for features like uncertainty that are inherently bound up with what the prompt is *about*. Almost any way of making a prompt more uncertain changes its vocabulary or structure as well.

A more careful study of uncertainty in LLMs probably wants to move away from mean-difference directions and toward either single-prompt interventions (perturbing one example and reading off logit changes), probing classifiers trained with proper regularization and control tasks, or sparse-autoencoder features explicitly selected against distributional confounds. The null result here isn't a claim that uncertainty has no linear representation in GPT-2 small, only that this particular recipe can't recover it.

## Setup

| Component | Details |
|---|---|
| Model | GPT-2 small (124M), HuggingFace `gpt2` |
| Site of intervention | Final-block residual stream, last token position |
| Direction | Unit-normalized mean activation difference between two prompt sets |
| Projection | Dot product of per-prompt last-token residual with the unit direction |
| Unembedding readout | Direction $\cdot$ $W_U$ softmax top-k |

All 133 prompts from the interactive demo were run once through GPT-2 small. Per-prompt projections and per-direction top-k unembedding tokens were dumped to a small JSON and loaded by the browser; the page itself does not run the model. See `extract_vectors_web.py` in the [project repo](https://github.com/abhishuoza/uncertainty-direction-llm).

## Resources

- Panickssery, A., Gabrieli, N., Schulz, J., Tong, M., Hubinger, E., & Turner, A. M. (2024). [Steering Llama 2 via Contrastive Activation Addition](https://arxiv.org/abs/2312.06681). *arXiv:2312.06681*. The contrastive-direction recipe applied at scale.
- Zou, A., Phan, L., Chen, S., Campbell, J., Guo, P., Ren, R., Pan, A., Yin, X., Mazeika, M., Dombrowski, A.-K., Goel, S., Li, N., Byun, M. J., Wang, Z., Mallen, A., Basart, S., Koyejo, S., Song, D., Fredrikson, M., Kolter, J. Z., & Hendrycks, D. (2023). [Representation Engineering: A Top-Down Approach to AI Transparency](https://arxiv.org/abs/2310.01405). *arXiv:2310.01405*. Broader survey of finding feature directions this way.
- Templeton, A., Conerly, T., Marcus, J., Lindsey, J., Bricken, T., Chen, B., Pearce, A., Citro, C., Ameisen, E., Jones, A., Cunningham, H., Turner, N. L., McDougall, C., MacDiarmid, M., Freeman, C. D., Sumers, T. R., Rees, E., Batson, J., Jermyn, A., Carter, S., Olah, C., & Henighan, T. (2024). [Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet](https://transformer-circuits.pub/2024/scaling-monosemanticity/). *Transformer Circuits*. Sparse-autoencoder features as an alternative to contrastive mean-difference directions.
- Nanda, N. & Bloom, J. (2022+). [TransformerLens](https://transformerlensorg.github.io/TransformerLens/). The original experiments used this; the web demo uses plain HuggingFace for portability.
