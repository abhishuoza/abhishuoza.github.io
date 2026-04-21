// DDIM sampler for the in-browser MNIST DDPM.
//
// Mirrors the math in ddpm/diffusion.py ddim_sample(), specialized for:
//   - eta = 0 (deterministic DDIM)
//   - prediction_type = epsilon
//   - classifier-free guidance via batched conditional + unconditional forward
//
// Exposes a single async generator `ddimSample()` that yields the predicted
// x_0 at every step, so the UI can animate the denoising process.

const IMG_PLANE = 28 * 28;

// Build descending DDIM timestep subsequence, matching the Python logic.
export function buildDdimSchedule(numTimesteps, numSteps) {
  const stepSize = Math.floor(numTimesteps / numSteps);
  const seq = [];
  for (let t = 0; t < numTimesteps; t += stepSize) seq.push(t);
  if (seq[seq.length - 1] !== numTimesteps - 1) seq.push(numTimesteps - 1);
  seq.reverse();
  const pairs = [];
  for (let i = 0; i < seq.length - 1; i++) pairs.push([seq[i], seq[i + 1]]);
  return pairs;
}

// Box–Muller: fill `out` with i.i.d. standard normals.
function randnInto(out, rng) {
  for (let i = 0; i < out.length; i += 2) {
    let u1 = rng();
    const u2 = rng();
    if (u1 < 1e-12) u1 = 1e-12;
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    out[i] = mag * Math.cos(2 * Math.PI * u2);
    if (i + 1 < out.length) out[i + 1] = mag * Math.sin(2 * Math.PI * u2);
  }
}

// Mulberry32 seeded PRNG for reproducible "same seed" generations.
export function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Apply CFG: eps = eps_uncond + w * (eps_cond - eps_uncond). In-place on `cond`.
function applyCfg(cond, uncond, scale) {
  for (let i = 0; i < cond.length; i++) {
    cond[i] = uncond[i] + scale * (cond[i] - uncond[i]);
  }
}

// One DDIM step (eta=0): x = sqrt(ab_next)*x0_pred + sqrt(1 - ab_next)*eps
// Writes into `xOut` (may alias with `xIn`).
function ddimStep(xIn, eps, abNow, abNext, xOut) {
  const sqrtAbNow = Math.sqrt(abNow);
  const sqrtOneMinusAbNow = Math.sqrt(1 - abNow);
  const sqrtAbNext = Math.sqrt(abNext);
  const sqrtOneMinusAbNext = Math.sqrt(1 - abNext);
  for (let i = 0; i < xIn.length; i++) {
    // Predicted x_0, clamped to [-1, 1]
    let x0 = (xIn[i] - sqrtOneMinusAbNow * eps[i]) / sqrtAbNow;
    if (x0 > 1) x0 = 1;
    else if (x0 < -1) x0 = -1;
    xOut[i] = sqrtAbNext * x0 + sqrtOneMinusAbNext * eps[i];
  }
}

// Compute x0_pred from (x_t, eps, alpha_bar_t), clamped to [-1, 1]. Writes into `out`.
function predictX0(x, eps, abNow, out) {
  const sqrtAbNow = Math.sqrt(abNow);
  const sqrtOneMinusAbNow = Math.sqrt(1 - abNow);
  for (let i = 0; i < x.length; i++) {
    let v = (x[i] - sqrtOneMinusAbNow * eps[i]) / sqrtAbNow;
    if (v > 1) v = 1;
    else if (v < -1) v = -1;
    out[i] = v;
  }
}

/**
 * Run DDIM sampling as an async generator.
 *
 * Each yield is `{ step, total, tNow, x0Pred, xT }` where x0Pred and xT are
 * Float32Arrays of length (numImages * 28 * 28) in the [-1, 1] range.
 *
 * @param {object} session   onnxruntime-web InferenceSession
 * @param {object} schedule  parsed schedule.json
 * @param {number[]} classIds  length N array of class ids (0-9)
 * @param {object} opts
 * @param {number} opts.numSteps     DDIM steps (default 50)
 * @param {number} opts.cfgScale     classifier-free guidance scale (default 3)
 * @param {number} opts.seed         PRNG seed
 * @param {(step:number,total:number)=>boolean} [opts.shouldStop]
 *                                  called each step; if returns true, sampling aborts
 */
export async function* ddimSample(session, schedule, classIds, opts = {}) {
  const { numSteps = 50, cfgScale = 3.0, seed = 1, shouldStop = null } = opts;

  const N = classIds.length;
  const planeSize = IMG_PLANE;
  const alphaBar = schedule.alpha_bar;
  const nullClass = schedule.null_class;
  const pairs = buildDdimSchedule(schedule.num_timesteps, numSteps);
  const total = pairs.length;

  const useCfg = cfgScale !== 1.0;
  const batch = useCfg ? 2 * N : N;
  const bufLen = batch * planeSize;

  // x_t buffer (the N images)
  const x = new Float32Array(N * planeSize);
  const rng = seededRng(seed);
  randnInto(x, rng);

  // Batched model input: [cond batch | uncond batch]. Reused across steps.
  const xBatch = new Float32Array(bufLen);
  const tArr = new BigInt64Array(batch);
  const yArr = new BigInt64Array(batch);
  for (let i = 0; i < N; i++) {
    yArr[i] = BigInt(classIds[i]);
    if (useCfg) yArr[i + N] = BigInt(nullClass);
  }

  const x0PredBuf = new Float32Array(N * planeSize);
  const epsGuided = new Float32Array(N * planeSize);

  for (let step = 0; step < total; step++) {
    if (shouldStop && shouldStop(step, total)) return;

    const [tNow, tNext] = pairs[step];
    const abNow = alphaBar[tNow];
    const abNext = tNext > 0 ? alphaBar[tNext] : 1.0;
    const tBig = BigInt(tNow);
    for (let b = 0; b < batch; b++) tArr[b] = tBig;

    // Pack cond batch (x); if CFG, append same x as uncond batch.
    xBatch.set(x, 0);
    if (useCfg) xBatch.set(x, N * planeSize);

    const xTensor = new ort.Tensor("float32", xBatch, [batch, 1, 28, 28]);
    const tTensor = new ort.Tensor("int64", tArr, [batch]);
    const yTensor = new ort.Tensor("int64", yArr, [batch]);

    const out = await session.run({ x: xTensor, t: tTensor, y: yTensor });
    const eps = out.eps.data; // Float32Array, length = batch * planeSize

    // Compute guided eps per-image
    for (let i = 0; i < N; i++) {
      const offset = i * planeSize;
      if (useCfg) {
        const uncondOffset = (N + i) * planeSize;
        for (let j = 0; j < planeSize; j++) {
          const ec = eps[offset + j];
          const eu = eps[uncondOffset + j];
          epsGuided[offset + j] = eu + cfgScale * (ec - eu);
        }
      } else {
        for (let j = 0; j < planeSize; j++) epsGuided[offset + j] = eps[offset + j];
      }
    }

    // Predicted x_0 for display (computed from current x_t, before the step)
    predictX0(x, epsGuided, abNow, x0PredBuf);

    // Yield current state
    yield {
      step,
      total,
      tNow,
      x0Pred: new Float32Array(x0PredBuf),
      xT: new Float32Array(x),
    };

    // DDIM step -> x_{t-1}
    ddimStep(x, epsGuided, abNow, abNext, x);
  }

  // Final state (x is now x_0)
  yield {
    step: total,
    total,
    tNow: 0,
    x0Pred: new Float32Array(x),
    xT: new Float32Array(x),
    done: true,
  };
}
