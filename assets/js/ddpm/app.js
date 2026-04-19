import { ddimSample } from "./sampler.js";

const MODEL_URL = "/assets/models/ddpm_mnist.onnx";
const SCHEDULE_URL = "/assets/models/ddpm_mnist.schedule.json";
const WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";

const CANVAS_SIZE = 280; // displayed size of 28x28 image
const DEFAULT_STEPS = 50;
const DEFAULT_CFG = 3.0;

class DDPMApp {
  constructor(root) {
    this.root = root;
    this.el = {
      status: root.querySelector("#ddpm-status"),
      digits: [...root.querySelectorAll("[data-digit]")],
      canvas: root.querySelector("#ddpm-canvas"),
      tag: root.querySelector("#ddpm-canvas-tag"),
      stepLabel: root.querySelector("#ddpm-step-label"),
      progressBar: root.querySelector("#ddpm-progress-fill"),
      regen: root.querySelector("#ddpm-regen"),
      cfgSlider: root.querySelector("#ddpm-cfg"),
      cfgVal: root.querySelector("#ddpm-cfg-val"),
      stepsSlider: root.querySelector("#ddpm-steps"),
      stepsVal: root.querySelector("#ddpm-steps-val"),
      viewRadios: [...root.querySelectorAll("input[name=ddpm-view]")],
    };

    this.session = null;
    this.schedule = null;
    this.activeDigit = null;
    this.abortRequested = false;
    this.isRunning = false;
    this.lastFrame = null; // { x0Pred, xT } for redraw on view toggle
    this.currentView = "xt";
    this.seedCounter = 1;

    this.ctx = this.el.canvas.getContext("2d");
    this.el.canvas.width = CANVAS_SIZE;
    this.el.canvas.height = CANVAS_SIZE;
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = 28;
    this.offscreen.height = 28;
    this.offCtx = this.offscreen.getContext("2d");

    // Render initial placeholder noise
    this.renderPlaceholder();
    this.bindUi();
    this.init();
  }

  bindUi() {
    this.el.digits.forEach((btn) => {
      btn.addEventListener("click", () => {
        const digit = parseInt(btn.dataset.digit, 10);
        this.generate(digit);
      });
    });
    this.el.regen.addEventListener("click", () => {
      if (this.activeDigit === null) return;
      this.seedCounter = (this.seedCounter + 1) >>> 0;
      this.generate(this.activeDigit);
    });
    this.el.cfgSlider.addEventListener("input", () => {
      this.el.cfgVal.textContent = (parseFloat(this.el.cfgSlider.value)).toFixed(1);
    });
    this.el.stepsSlider.addEventListener("input", () => {
      this.el.stepsVal.textContent = this.el.stepsSlider.value;
    });
    this.el.viewRadios.forEach((r) => {
      r.addEventListener("change", () => {
        if (r.checked) {
          this.currentView = r.value;
          this.el.tag.textContent = r.value === "x0" ? "predicted x₀" : "noisy xₜ";
          if (this.lastFrame) this.drawFrame(this.lastFrame);
        }
      });
    });
  }

  async init() {
    try {
      this.setStatus("Loading model…");
      ort.env.wasm.wasmPaths = WASM_BASE;
      ort.env.wasm.numThreads = 1;

      const [scheduleResp] = await Promise.all([fetch(SCHEDULE_URL)]);
      if (!scheduleResp.ok) throw new Error(`Schedule fetch failed: ${scheduleResp.status}`);
      this.schedule = await scheduleResp.json();

      const providers = [];
      if (navigator.gpu) providers.push("webgpu");
      providers.push("wasm");

      this.session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: providers,
        graphOptimizationLevel: "all",
      });

      this.setStatus("Ready — pick a digit to generate.");
      this.setDigitsEnabled(true);
    } catch (e) {
      console.error(e);
      this.setStatus(`Failed to load model: ${e.message}`, "err");
    }
  }

  setStatus(text, kind = null) {
    this.el.status.textContent = text;
    this.el.status.className = "ddpm-status" + (kind ? ` ddpm-status-${kind}` : "");
  }

  setDigitsEnabled(enabled) {
    this.el.digits.forEach((b) => (b.disabled = !enabled));
    this.el.regen.disabled = !enabled || this.activeDigit === null;
  }

  setActiveDigit(digit) {
    this.activeDigit = digit;
    this.el.digits.forEach((b) => {
      b.classList.toggle("ddpm-digit-active", parseInt(b.dataset.digit, 10) === digit);
    });
    this.el.regen.disabled = digit === null;
  }

  async generate(digit) {
    if (this.isRunning) {
      this.abortRequested = true;
      while (this.isRunning) await new Promise((r) => setTimeout(r, 10));
    }
    this.abortRequested = false;
    this.isRunning = true;
    this.setActiveDigit(digit);

    const cfgScale = parseFloat(this.el.cfgSlider.value);
    const numSteps = parseInt(this.el.stepsSlider.value, 10);

    this.setStatus(`Generating digit ${digit}…`);
    this.el.progressBar.style.width = "0%";

    const seed = ((digit + 1) * 2654435761 + this.seedCounter * 97) >>> 0;

    const gen = ddimSample(this.session, this.schedule, [digit], {
      numSteps,
      cfgScale,
      seed,
      shouldStop: () => this.abortRequested,
    });

    const totalStart = performance.now();
    try {
      for await (const frame of gen) {
        this.lastFrame = frame;
        this.drawFrame(frame);
        const pct = Math.round((frame.step / frame.total) * 100);
        this.el.progressBar.style.width = `${pct}%`;
        this.el.stepLabel.textContent = frame.done
          ? `Done — ${numSteps} steps in ${((performance.now() - totalStart) / 1000).toFixed(2)}s`
          : `Step ${frame.step + 1}/${frame.total} · timestep t=${frame.tNow}`;
        // Yield to the event loop so the canvas actually updates.
        // Use setTimeout(0) rather than rAF — rAF is throttled (or suspended)
        // in backgrounded tabs, which would stall sampling.
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!this.abortRequested) this.setStatus(`Digit ${digit} ready. Click another digit or “New seed” to regenerate.`);
    } catch (e) {
      console.error(e);
      this.setStatus(`Error: ${e.message}`, "err");
    } finally {
      this.isRunning = false;
    }
  }

  drawFrame(frame) {
    const data = this.currentView === "x0" ? frame.x0Pred : frame.xT;
    this.renderImage(data);
  }

  renderImage(flat) {
    // flat is a Float32Array of length 784, roughly in [-1, 1]
    const img = this.offCtx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      let v = flat[i];
      if (v < -1) v = -1;
      else if (v > 1) v = 1;
      // Map [-1, 1] -> [0, 255] (255 = white digit on black bg, matches MNIST)
      const g = Math.round(((v + 1) * 0.5) * 255);
      img.data[i * 4 + 0] = g;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = g;
      img.data[i * 4 + 3] = 255;
    }
    this.offCtx.putImageData(img, 0, 0);
    // Upscale to the visible canvas with smoothing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.ctx.drawImage(this.offscreen, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  renderPlaceholder() {
    // Initial noise placeholder
    const noise = new Float32Array(784);
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 784; i += 2) {
      const u1 = Math.max(1e-6, rand());
      const u2 = rand();
      const mag = Math.sqrt(-2 * Math.log(u1));
      noise[i] = 0.9 * mag * Math.cos(2 * Math.PI * u2);
      if (i + 1 < 784) noise[i + 1] = 0.9 * mag * Math.sin(2 * Math.PI * u2);
    }
    this.renderImage(noise);
  }
}

function init() {
  const root = document.getElementById("ddpm-app");
  if (!root) return;
  new DDPMApp(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
