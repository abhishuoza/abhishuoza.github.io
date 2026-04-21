---
title: "DDPM from Scratch"
excerpt: "A denoising diffusion model for MNIST: watch it generate a digit from pure noise running live in your browser"
date: 2024-08-01
github: https://github.com/abhishuoza/ddpm-from-scratch
math: true
header:
  teaser: /assets/images/portfolio/ddpm-teaser.png
classes: wide
---

<style>
.layout--single .page__inner-wrap { max-width: 1100px; }

#ddpm-app {
  --ddpm-bg: #ffffff;
  --ddpm-border: #d8dee7;
  --ddpm-ink: #1f2937;
  --ddpm-ink-muted: #6b7280;
  --ddpm-accent: #7c3aed;
  --ddpm-accent-soft: #ede9fe;
  --ddpm-err: #dc2626;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0 2.5rem;
  color: var(--ddpm-ink);
  font-size: 15px;
}

.ddpm-status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 28px;
}
.ddpm-status { font-weight: 600; font-size: 1rem; }
.ddpm-status-err { color: var(--ddpm-err); }

.ddpm-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}
@media (max-width: 820px) {
  .ddpm-main { grid-template-columns: 1fr; }
}

.ddpm-canvas-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}
.ddpm-canvas-wrap {
  position: relative;
  background: #0b0d12;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
#ddpm-canvas {
  display: block;
  width: 280px;
  height: 280px;
  border-radius: 4px;
}
.ddpm-canvas-tag {
  position: absolute;
  bottom: 14px;
  right: 14px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.75);
  background: rgba(0,0,0,0.35);
  padding: 2px 8px;
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.03em;
}
.ddpm-step-label {
  font-size: 0.82rem;
  color: var(--ddpm-ink-muted);
  font-variant-numeric: tabular-nums;
  min-height: 1.2em;
}

.ddpm-progress {
  width: 280px;
  height: 4px;
  background: #eef1f5;
  border-radius: 2px;
  overflow: hidden;
}
.ddpm-progress-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #7c3aed, #ec4899);
  transition: width 80ms linear;
}

.ddpm-controls-col {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.ddpm-digit-heading {
  font-size: 0.78rem;
  color: var(--ddpm-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.ddpm-digits {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.ddpm-digit {
  aspect-ratio: 1 / 1;
  font-size: 1.3rem;
  font-weight: 600;
  background: white;
  border: 1.5px solid var(--ddpm-border);
  border-radius: 8px;
  color: var(--ddpm-ink);
  cursor: pointer;
  transition: all 0.12s ease;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ddpm-digit:hover:not(:disabled) {
  border-color: var(--ddpm-accent);
  color: var(--ddpm-accent);
  transform: translateY(-1px);
}
.ddpm-digit:disabled { opacity: 0.4; cursor: not-allowed; }
.ddpm-digit-active {
  background: var(--ddpm-accent);
  border-color: var(--ddpm-accent);
  color: white !important;
  transform: none;
}

.ddpm-regen {
  padding: 0.5rem 0.9rem;
  background: white;
  border: 1.5px solid var(--ddpm-border);
  border-radius: 8px;
  color: var(--ddpm-ink);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
}
.ddpm-regen:hover:not(:disabled) { border-color: var(--ddpm-accent); color: var(--ddpm-accent); }
.ddpm-regen:disabled { opacity: 0.4; cursor: not-allowed; }

.ddpm-view {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--ddpm-ink-muted);
  flex-wrap: wrap;
}
.ddpm-view label { cursor: pointer; display: flex; align-items: center; gap: 4px; }

.ddpm-sliders {
  border-top: 1px solid var(--ddpm-border);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.ddpm-slider-row {
  display: grid;
  grid-template-columns: 120px 1fr 50px;
  gap: 0.7rem;
  align-items: center;
  font-size: 0.85rem;
}
.ddpm-slider-row label { color: var(--ddpm-ink-muted); }
.ddpm-slider-row input[type=range] { width: 100%; accent-color: var(--ddpm-accent); }
.ddpm-slider-row .ddpm-slider-val {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--ddpm-ink);
  font-weight: 600;
}

.ddpm-hint {
  font-size: 0.78rem;
  color: var(--ddpm-ink-muted);
  line-height: 1.45;
  margin-top: 0.2rem;
}
</style>

<div id="ddpm-app">
  <div class="ddpm-status-bar">
    <span id="ddpm-status" class="ddpm-status">Loading…</span>
  </div>

  <div class="ddpm-main">
    <div class="ddpm-canvas-col">
      <div class="ddpm-canvas-wrap">
        <canvas id="ddpm-canvas"></canvas>
        <span id="ddpm-canvas-tag" class="ddpm-canvas-tag">noisy xₜ</span>
      </div>
      <div class="ddpm-progress"><div id="ddpm-progress-fill" class="ddpm-progress-fill"></div></div>
      <div id="ddpm-step-label" class="ddpm-step-label">Ready</div>
    </div>

    <div class="ddpm-controls-col">
      <div>
        <div class="ddpm-digit-heading">Pick a digit to generate</div>
        <div class="ddpm-digits">
          <button class="ddpm-digit" data-digit="0" disabled>0</button>
          <button class="ddpm-digit" data-digit="1" disabled>1</button>
          <button class="ddpm-digit" data-digit="2" disabled>2</button>
          <button class="ddpm-digit" data-digit="3" disabled>3</button>
          <button class="ddpm-digit" data-digit="4" disabled>4</button>
          <button class="ddpm-digit" data-digit="5" disabled>5</button>
          <button class="ddpm-digit" data-digit="6" disabled>6</button>
          <button class="ddpm-digit" data-digit="7" disabled>7</button>
          <button class="ddpm-digit" data-digit="8" disabled>8</button>
          <button class="ddpm-digit" data-digit="9" disabled>9</button>
        </div>
        <div style="margin-top: 0.6rem;">
          <button id="ddpm-regen" class="ddpm-regen" disabled>↻ New seed</button>
        </div>
      </div>

      <div class="ddpm-view">
        <span style="font-weight:600;color:var(--ddpm-ink);">View:</span>
        <label><input type="radio" name="ddpm-view" value="x0"> predicted x₀ (what the model thinks it's heading towards)</label>
        <label><input type="radio" name="ddpm-view" value="xt" checked> noisy xₜ (what the sampler is actually holding)</label>
      </div>

      <div class="ddpm-sliders">
        <div class="ddpm-slider-row">
          <label for="ddpm-cfg">Guidance (CFG)</label>
          <input id="ddpm-cfg" type="range" min="0" max="5" step="0.1" value="1.0">
          <span id="ddpm-cfg-val" class="ddpm-slider-val">1.0</span>
        </div>
        <div class="ddpm-slider-row">
          <label for="ddpm-steps">DDIM steps</label>
          <input id="ddpm-steps" type="range" min="10" max="50" step="5" value="25">
          <span id="ddpm-steps-val" class="ddpm-slider-val">25</span>
        </div>
        <div class="ddpm-hint">
          Sweet spot for reliable digit generation: <strong>CFG ≈ 1–2</strong>,
          <strong>10–25 steps</strong>. Push either higher and you'll often see
          the sample converge to the right digit and then drift into a different
          , often mixed shape.
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js"></script>
<script type="module" src="/assets/js/ddpm/app.js"></script>

Stack: Python, PyTorch. Browser port uses onnxruntime-web.

## About this project

This is a from-scratch implementation of [DDPM](https://arxiv.org/abs/2006.11239) (Denoising Diffusion Probabilistic Models), the class of generative models behind Stable Diffusion and most modern image generators. The model you're playing with above is a 15.7 M-parameter U-Net trained on MNIST for 250 epochs with classifier-free guidance, and it's running live in your browser.

Diffusion models learn to generate images by reversing a noise process. During training, we progressively corrupt real images with Gaussian noise over many small steps until they're indistinguishable from pure noise. Then a neural network learns to predict, at every noise level, *what noise was added*. At inference time we flip this around: start from pure noise, ask the network "what noise do you see?", subtract a bit of it, repeat.

The visualization above lets you watch that loop directly. The "predicted x₀" view shows the model's best guess at the final image at every step: it starts at noise and gradually sharpens into the asked digit. The "noisy xₜ" view shows what the sampler is literally holding in memory at each step, which stays noisy until the very end. Both are valid windows into the same process, and flipping between them is a great way to build intuition for what diffusion is actually doing.

## DDPM

The training objective is remarkably simple. We sample a random image $x_0$ from the dataset, a random timestep $t \in [1, T]$, and a fresh noise vector $\epsilon \sim \mathcal{N}(0, I)$. Using a closed-form expression, we jump directly to the noisy image at step $t$:

$$x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1-\bar\alpha_t}\, \epsilon$$

where $\bar\alpha_t$ is determined by a fixed noise schedule (this project uses the cosine schedule from Nichol & Dhariwal, which allocates more capacity to low-noise steps). The network is trained to predict the noise $\epsilon$ that was added:

$$L = \mathbb{E}_{t, x_0, \epsilon}\left[\left\| \epsilon - \epsilon_\theta(x_t, t, y) \right\|^2\right]$$

Given a trained noise predictor, we can invert the forward process one step at a time. This project uses DDIM ([Song et al., 2020](https://arxiv.org/abs/2010.02502)), a non-Markovian reverse formulation that lets us take big steps and still get good samples, so the 200-step training-time schedule runs at inference in just 50 steps.

Class conditioning uses classifier-free guidance ([Ho & Salimans, 2022](https://arxiv.org/abs/2207.12598)): during training the class label is randomly dropped with 10% probability, teaching the model both conditional $\epsilon_\theta(x_t, t, y)$ and unconditional $\epsilon_\theta(x_t, t, \varnothing)$ behaviors in a single network. At inference, we extrapolate toward the conditional prediction:

$$\hat\epsilon = \epsilon_\theta(x_t, t, \varnothing) + w \cdot \left(\epsilon_\theta(x_t, t, y) - \epsilon_\theta(x_t, t, \varnothing)\right)$$

The guidance slider above is exactly that $w$. At $w = 1$ you get the conditional model. Push it to 5 or 6 and samples snap to a canonical template of the digit. Drop it to 0 and you get an unconditional generation, which mostly ignores your digit choice.

<!-- ## Running on the browser

- The exact PyTorch EMA weights, exported to ONNX (60 MB) and run via [onnxruntime-web](https://github.com/microsoft/onnxruntime). WebGPU if your browser supports it, otherwise WebAssembly.
- The DDIM sampler, including CFG batching, ported directly to JavaScript. Conditional and unconditional forward passes are batched into a single model call per step.
- Per-step inference: about 30-60 ms on modern hardware, so a 50-step DDIM trajectory lands in 2-3 seconds. -->

## Resources

**Explainers**

- 3Blue1Brown & Welch Labs. [But how do AI images/videos actually work?](https://youtu.be/iv-5mZ_9CPY). A fantastic visual explainer of diffusion-based image generation.
- Lilian Weng. [What are Diffusion Models?](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/). The go-to technical walkthrough.
- Sander Dieleman. [Diffusion models are autoencoders](https://sander.ai/2022/01/31/diffusion.html). Great intuition-building.

**Papers**

- Ho, J., Jain, A., & Abbeel, P. (2020). [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239). *NeurIPS 2020*.
- Nichol, A. & Dhariwal, P. (2021). [Improved Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2102.09672). *ICML 2021*.
- Song, J., Meng, C., & Ermon, S. (2021). [Denoising Diffusion Implicit Models](https://arxiv.org/abs/2010.02502). *ICLR 2021*.
- Ho, J. & Salimans, T. (2022). [Classifier-Free Diffusion Guidance](https://arxiv.org/abs/2207.12598). *NeurIPS 2021 Workshop*.
