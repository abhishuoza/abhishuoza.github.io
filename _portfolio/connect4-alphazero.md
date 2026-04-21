---
title: "Connect4 AlphaZero"
excerpt: "From-scratch AlphaZero implementation: play against my trained model running live in your browser."
date: 2024-06-01
github: https://github.com/abhishuoza/Connect4-AlphaZero
header:
  teaser: /assets/images/portfolio/connect4-teaser.png
classes: wide
---

<style>
/* Give this page more breathing room than the blog-post cap. */
.layout--single .page__inner-wrap { max-width: 1100px; }

#c4-app {
  --c4-board-bg: #ffffff;
  --c4-cell-empty: #eef1f5;
  --c4-border: #d8dee7;
  --c4-ink: #1f2937;
  --c4-ink-muted: #6b7280;
  --c4-accent: #2563eb;
  --c4-win: #10b981;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0 2.5rem;
  color: var(--c4-ink);
  font-size: 15px;
}

/* Status bar */
.c4-status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 28px;
}
.c4-status {
  font-weight: 600;
  font-size: 1rem;
}
.c4-status-win { color: #059669; }
.c4-status-lose { color: #dc2626; }
.c4-status-draw { color: var(--c4-ink-muted); }
.c4-status-err { color: #dc2626; }

.c4-sim-progress { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 160px; }
.c4-sim-bar { flex: 1; height: 6px; background: #eef1f5; border-radius: 3px; overflow: hidden; max-width: 220px; }
.c4-sim-bar-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #4f46e5, #8b5cf6);
  transition: width 0.1s linear;
}
.c4-sim-label { font-size: 0.8rem; color: var(--c4-ink-muted); font-variant-numeric: tabular-nums; }

/* Main layout */
.c4-main {
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}
@media (max-width: 820px) {
  .c4-main { grid-template-columns: 1fr; }
}

.c4-board-col { display: flex; flex-direction: column; align-items: center; }

/* Board */
.c4-hover-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
  max-width: 520px;
  gap: 6px;
  padding: 6px 8px 0;
  box-sizing: border-box;
}
.c4-hover-slot {
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
}
.c4-hover-slot.c4-hover-active::before {
  content: "";
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: var(--piece-color, var(--c4-accent));
  opacity: 0.45;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.c4-board {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  aspect-ratio: 7 / 6;
  width: 100%;
  max-width: 520px;
  background: var(--c4-board-bg);
  border: 1.5px solid var(--c4-border);
  border-radius: 12px;
  padding: 8px;
  gap: 6px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.c4-cell {
  background: var(--c4-cell-empty);
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.c4-piece {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  opacity: 0;
  background: var(--piece-color, transparent);
}
.c4-piece-placed {
  opacity: 1;
  box-shadow:
    inset -2px -3px 5px rgba(0,0,0,0.18),
    inset 2px 2px 4px rgba(255,255,255,0.25);
}
.c4-piece-drop {
  animation: c4-drop 0.32s cubic-bezier(0.3, 0.8, 0.4, 1);
}
@keyframes c4-drop {
  from { transform: translateY(calc(-1 * var(--drop-distance, 300%))); }
  to   { transform: translateY(0); }
}
.c4-piece-win {
  animation: c4-pulse 1.3s ease-in-out infinite;
}
@keyframes c4-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--c4-win), inset -2px -3px 5px rgba(0,0,0,0.18), inset 2px 2px 4px rgba(255,255,255,0.25); }
  50%      { box-shadow: 0 0 0 6px var(--c4-win), inset -2px -3px 5px rgba(0,0,0,0.18), inset 2px 2px 4px rgba(255,255,255,0.25); }
}

/* Nerdy panel */
.c4-nerdy {
  background: #fafbfc;
  border: 1px solid var(--c4-border);
  border-radius: 10px;
  padding: 1rem 1.1rem 1.2rem;
}
.c4-nerdy h4 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
  color: var(--c4-ink);
}
.c4-nerdy-note {
  font-size: 0.78rem;
  color: var(--c4-ink-muted);
  margin-bottom: 1rem;
  line-height: 1.4;
}
.c4-nerdy-sub {
  font-size: 0.75rem;
  color: var(--c4-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 1rem 0 0.4rem;
  font-weight: 600;
}

.c4-policy-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  align-items: end;
}
.c4-policy-col { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.c4-policy-outer {
  width: 100%;
  height: 90px;
  background: #eef1f5;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}
.c4-policy-inner {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 0;
  background: linear-gradient(to top, #6b7280, #9ca3af);
  transition: height 0.25s ease;
}
.c4-policy-inner.c4-policy-best {
  background: linear-gradient(to top, #2563eb, #60a5fa);
}
.c4-policy-label { font-size: 0.7rem; color: var(--c4-ink-muted); margin-top: 4px; }
.c4-policy-val { font-size: 0.72rem; color: var(--c4-ink); font-variant-numeric: tabular-nums; margin-top: 1px; }

.c4-value-meter {
  position: relative;
  height: 28px;
  background: #eef1f5;
  border-radius: 14px;
  overflow: hidden;
  margin-top: 0.3rem;
}
.c4-value-fill {
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 0;
  background: #9ca3af;
  transition: width 0.25s ease, left 0.25s ease, background 0.25s;
}
.c4-value-positive { background: #10b981; }
.c4-value-negative { background: #ef4444; }
.c4-value-meter::before {
  content: "";
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 1px;
  background: #d1d5db;
  z-index: 1;
}
.c4-value-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--c4-ink);
  z-index: 2;
}
.c4-value-perspective { font-weight: 400; color: var(--c4-ink-muted); font-size: 0.75rem; margin-left: 6px; }

/* JS widens or narrows the fill depending on sign. Controlled inline. */
.c4-value-fill.c4-value-positive { left: 50%; }
.c4-value-fill.c4-value-negative { left: auto; right: 50%; }

/* Controls */
.c4-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.75rem 0;
  border-top: 1px solid var(--c4-border);
}
.c4-control { display: flex; align-items: center; gap: 0.5rem; }
.c4-control label { font-size: 0.85rem; color: var(--c4-ink-muted); }
.c4-control select, .c4-control input[type=checkbox] { font-size: 0.85rem; }
.c4-control select {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--c4-border);
  background: white;
}
.c4-btn {
  padding: 0.45rem 0.9rem;
  background: var(--c4-accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
}
.c4-btn:hover { background: #1d4ed8; }
.c4-btn-secondary { background: #6b7280; }
.c4-btn-secondary:hover { background: #4b5563; }

/* Game over */
.c4-game-over {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  background: #f9fafb;
  border: 1px solid var(--c4-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.c4-game-over-msg { font-size: 1rem; font-weight: 600; margin-right: auto; }
.c4-go-win { color: #059669; }
.c4-go-lose { color: #dc2626; }
.c4-go-draw { color: var(--c4-ink-muted); }
</style>

<div id="c4-app">
  <div class="c4-status-bar">
    <span id="c4-status" class="c4-status">Loading…</span>
    <div class="c4-sim-progress">
      <div id="c4-sim-bar" class="c4-sim-bar" hidden><div id="c4-sim-bar-fill" class="c4-sim-bar-fill"></div></div>
      <span id="c4-sim-label" class="c4-sim-label" hidden></span>
    </div>
  </div>

  <div class="c4-main">
    <div class="c4-board-col">
      <div id="c4-hover-row" class="c4-hover-row"></div>
      <div id="c4-board" class="c4-board"></div>
    </div>

    <div id="c4-nerdy" class="c4-nerdy" hidden>
      <h4 id="c4-nerdy-heading">AlphaZero's view</h4>
      <div id="c4-nerdy-note" class="c4-nerdy-note">Toggle Nerdy mode below to peek at what the model is thinking.</div>

      <div class="c4-nerdy-sub">Policy (per column)</div>
      <div id="c4-policy-bars" class="c4-policy-bars"></div>

      <div class="c4-nerdy-sub">Value <span id="c4-value-perspective" class="c4-value-perspective">(current player)</span></div>
      <div class="c4-value-meter">
        <div id="c4-value-fill" class="c4-value-fill"></div>
        <div id="c4-value-label" class="c4-value-label">—</div>
      </div>
    </div>
  </div>

  <div class="c4-controls">
    <div class="c4-control">
      <label for="c4-difficulty">Difficulty</label>
      <select id="c4-difficulty">
        <option value="easy">Easy (50 sims)</option>
        <option value="medium" selected>Medium (150 sims)</option>
        <option value="hard">Hard (400 sims)</option>
      </select>
    </div>
    <div class="c4-control">
      <label for="c4-side">You play</label>
      <select id="c4-side">
        <option value="1" selected>First (Blue)</option>
        <option value="-1">Second (Red)</option>
      </select>
    </div>
    <div class="c4-control">
      <label><input type="checkbox" id="c4-nerdy-toggle"> Nerdy mode</label>
    </div>
    <button id="c4-new-game" class="c4-btn">New game</button>
  </div>

  <div id="c4-game-over" class="c4-game-over" hidden>
    <span id="c4-game-over-msg" class="c4-game-over-msg"></span>
    <button id="c4-play-again" class="c4-btn">Play again</button>
    <button id="c4-switch-sides" class="c4-btn c4-btn-secondary">Switch sides</button>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js"></script>
<script type="module" src="/assets/js/connect4/app.js"></script>

I did a from-scratch implementation of [AlphaZero](https://deepmind.google/discover/blog/alphazero-shedding-new-light-on-chess-shogi-and-go/) and created a Connect 4 playing AI! The model you're playing above has learned entirely by playing with itself: it used no human games, no opening books, no evaluation heuristics.

Turn on **Nerdy mode** to watch the network's thinking: for the AI's last turn, you see the neural network's policy combined with Monte-Carlo Tree Search, along with a value estimate between −1 (losing) and +1 (winning) from the AI's perspective.

Stack: Python, PyTorch, NumPy. Browser port uses onnxruntime-web.

## About this project

Game playing AI has been an important milestone for scientists working on AI, because it's a controlled microcosm of the world where we can test how good an algorithm is, by seeing how what games it can play and the level of mastery it can achieve. IBM famously created DeepBlue to beat Garry Kasparov the world chess champion for the first time. However, DeepBlue was not a general AI because it had chess playing heuristics built in: openings, specific strategies etc. In a very real sense it was not AI because the same algorithm cannot be run on any game to learn it.

After Neural Networks came to the scene, DeepMind was the first to aggresively push on their ability to learn good strategies for games. AlphaZero was the culmination of this approach because it was the first algorithm that can learn virtually any difficult 2 player game and beat the best human players of the world, by doing nothing other than learning by playing games against itself!

Now admittedly Connect 4 is contained enough that it can be [solved via classical algorithms](http://blog.gamesolver.org/solving-connect-four/01-introduction/). However, AlphaZero can generalize to difficult 2 player games (like Chess and Go) and can become superhuman with enough training time (it's predecessor algorithm AlphaGo famously beat Lee sedol in 2016). Alphazero was a landmark moment for AI because it proved that neural networks can generalize in a way classical algorithms cannot. Making this was a way for me to understand the algorithm and witness the magic in a more visceral way (perhaps one day I'll try to train a really good Chess AI with it too...)

Current AIs are trained with a [surprisingly similar paradigm](https://x.com/polynoamial/status/2031404079583473953) - one of the key newer stages in LLM training is to sample a trajectory (recursively querying the LLM as opposed to a tree search in AlphaZero) and then rewarding it based on the end outcome (eg. whether it correctly solved a math problem as opposed to whether it won the game for AlphaZero).

## AlphaZero

AlphaZero is a self-improvement loop:

1. Self-play: The current network plays games against itself. At each move, MCTS uses the network's policy (move priors) and value (position evaluation) to simulate hundreds of possible continuations and pick the most-visited move.
2. Training: The network is trained to directly predict MCTS's move distribution and the eventual game outcome.
3. Repeat: Each new iteration's network guides stronger search, which produces better training data, which trains a stronger network.

There's no explicit reward model and no hand-crafted evaluation. The only information the model gets is "did this position lead to a win or a loss?"

The network (~1.6M parameters, 5-block ResNet with policy + value heads) was trained for 80 self-play iterations on a single machine. Each iteration plays 500 games against itself using Monte Carlo Tree Search guided by the current network, then trains the network to better predict the outcomes that search found.

<!-- ## Running in your browser right now:

- The exact PyTorch checkpoint from iteration 10, exported to ONNX (6 MB) and running via [onnxruntime-web](https://github.com/microsoft/onnxruntime) (WebGPU if your browser supports it, else WebAssembly).
- A direct JavaScript port of the game logic and MCTS from the original Python.
- Per-move inference: ~6 ms on a modern laptop, so even 400 MCTS simulations (the "hard" setting) is under 3 seconds. -->

## Resources

**Papers & guides**

- Silver, D., Hubert, T., Schrittwieser, J., Antonoglou, I., Lai, M., Guez, A., Lanctot, M., Sifre, L., Kumaran, D., Graepel, T., Lillicrap, T., Simonyan, K., & Hassabis, D. (2017). [Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm](https://arxiv.org/abs/1712.01815). *arXiv:1712.01815*. The original AlphaZero paper.
- Laurent, J. (2021). [AlphaZero.jl Documentation](https://jonathan-laurent.github.io/AlphaZero.jl/stable/). An in-depth walkthrough of the algorithm and its implementation details.

**Documentaries**

I also really like these documentaries from DeepMind:

- [*AlphaGo — The Movie*](https://youtu.be/WXuK6gekU1Y) (Kohs, G., 2017). Go had long been the holy grail of game-playing AI. This follows the development of AlphaGo (AlphaZero's predecessor) and its famous match against Lee Sedol.
- [*The Thinking Game*](https://youtu.be/d95J8yzvjbQ) (Tate, G., 2024). Truly general AI systems have been out of reach even decades after the invention of computers. This tells the story of DeepMind's pursuit of that grand challenge and its breakthroughs along the way.





