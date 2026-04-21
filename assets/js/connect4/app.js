import { Connect4, ROWS, COLS } from "./game.js";
import { MCTS, predictNet } from "./mcts.js";

const SIM_COUNTS = { easy: 50, medium: 150, hard: 400 };
const MODEL_URL = "/assets/models/connect4.onnx";
const WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";

const COLOR = {
  1: "#2563eb",   // Blue — player 1 (first)
  "-1": "#ef4444", // Red — player -1 (second)
};

class ConnectFourApp {
  constructor(root) {
    this.root = root;
    this.game = new Connect4();
    this.humanPlayer = 1;
    this.difficulty = "medium";
    this.nerdy = false;
    this.session = null;
    this.state = "loading"; // loading | human | ai | animating | gameover
    this.hoverCol = null;
    this.lastSearch = null; // { pi, rootValue, sims } — persists between moves

    this.el = {
      status: root.querySelector("#c4-status"),
      simBar: root.querySelector("#c4-sim-bar"),
      simBarFill: root.querySelector("#c4-sim-bar-fill"),
      simLabel: root.querySelector("#c4-sim-label"),
      board: root.querySelector("#c4-board"),
      hoverRow: root.querySelector("#c4-hover-row"),
      nerdy: root.querySelector("#c4-nerdy"),
      nerdyHeading: root.querySelector("#c4-nerdy-heading"),
      nerdyNote: root.querySelector("#c4-nerdy-note"),
      policyBars: root.querySelector("#c4-policy-bars"),
      valueFill: root.querySelector("#c4-value-fill"),
      valueLabel: root.querySelector("#c4-value-label"),
      valuePerspective: root.querySelector("#c4-value-perspective"),
      difficulty: root.querySelector("#c4-difficulty"),
      side: root.querySelector("#c4-side"),
      nerdyToggle: root.querySelector("#c4-nerdy-toggle"),
      newGame: root.querySelector("#c4-new-game"),
      gameOver: root.querySelector("#c4-game-over"),
      gameOverMsg: root.querySelector("#c4-game-over-msg"),
      playAgain: root.querySelector("#c4-play-again"),
      switchSides: root.querySelector("#c4-switch-sides"),
    };

    this.buildBoard();
    this.buildPolicyBars();
    this.attachEvents();
    this.loadModel();
  }

  // ---------- DOM ----------

  buildBoard() {
    const hover = this.el.hoverRow;
    const board = this.el.board;
    hover.innerHTML = "";
    board.innerHTML = "";
    for (let c = 0; c < COLS; c++) {
      const slot = document.createElement("div");
      slot.className = "c4-hover-slot";
      slot.dataset.col = c;
      hover.appendChild(slot);
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "c4-cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        const piece = document.createElement("div");
        piece.className = "c4-piece";
        cell.appendChild(piece);
        board.appendChild(cell);
      }
    }
  }

  buildPolicyBars() {
    this.el.policyBars.innerHTML = "";
    for (let c = 0; c < COLS; c++) {
      const wrap = document.createElement("div");
      wrap.className = "c4-policy-col";
      wrap.innerHTML = `
        <div class="c4-policy-outer"><div class="c4-policy-inner" data-col="${c}"></div></div>
        <div class="c4-policy-label">${c}</div>
        <div class="c4-policy-val" data-col="${c}">—</div>
      `;
      this.el.policyBars.appendChild(wrap);
    }
  }

  attachEvents() {
    const handleCol = (col) => this.onColumnClick(col);

    this.root.querySelectorAll(".c4-cell, .c4-hover-slot").forEach(el => {
      el.addEventListener("click", () => handleCol(parseInt(el.dataset.col, 10)));
      el.addEventListener("mouseenter", () => this.setHoverCol(parseInt(el.dataset.col, 10)));
    });
    this.root.addEventListener("mouseleave", () => this.setHoverCol(null));

    this.el.difficulty.addEventListener("change", (e) => {
      this.difficulty = e.target.value;
    });
    // Side selection only applies on the next new game, to avoid mid-game chaos.
    this.el.nerdyToggle.addEventListener("change", (e) => {
      this.nerdy = e.target.checked;
      this.el.nerdy.hidden = !this.nerdy;
      if (this.nerdy) this.renderNerdy();
    });
    this.el.newGame.addEventListener("click", () => this.startGame());
    this.el.playAgain.addEventListener("click", () => this.startGame());
    this.el.switchSides.addEventListener("click", () => {
      this.el.side.value = String(-this.humanPlayer);
      this.startGame();
    });
  }

  // ---------- Model ----------

  async loadModel() {
    this.setStatus("Downloading AlphaZero model (~6 MB)…");
    try {
      if (typeof ort === "undefined") throw new Error("onnxruntime-web failed to load");
      ort.env.wasm.wasmPaths = WASM_BASE;
      const providers = [];
      if (typeof navigator !== "undefined" && "gpu" in navigator) providers.push("webgpu");
      providers.push("wasm");
      this.session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: providers,
      });
      this.startGame();
    } catch (e) {
      console.error(e);
      this.setStatus("Failed to load model: " + e.message, "err");
    }
  }

  // ---------- Game flow ----------

  startGame() {
    this.humanPlayer = parseInt(this.el.side.value, 10);
    this.game = new Connect4();
    this.lastSearch = null;
    this.el.gameOver.hidden = true;
    this.render();
    if (this.nerdy) this.renderNerdy();
    if (this.humanPlayer === 1) {
      this.state = "human";
      this.setStatus("Your turn — click a column.");
    } else {
      this.state = "ai";
      this.setStatus("AI thinking…");
      this.runAiTurn();
    }
  }

  async onColumnClick(col) {
    if (this.state !== "human") return;
    if (!this.game.getValidMoves()[col]) return;
    await this.playMove(col, this.humanPlayer);
    if (this.game.isTerminal()) { this.finishGame(); return; }
    this.state = "ai";
    this.setStatus("AI thinking…");
    this.resetSimProgress();
    this.runAiTurn();
  }

  async runAiTurn() {
    const mcts = new MCTS(this.session, {
      numSimulations: SIM_COUNTS[this.difficulty],
      onProgress: (n, total) => this.onSimProgress(n, total),
    });
    this.showSimProgress(true);
    const { pi, visits, rootValue } = await mcts.search(this.game);
    this.showSimProgress(false);

    let best = 0, bestV = -1;
    for (let c = 0; c < COLS; c++) if (visits[c] > bestV) { bestV = visits[c]; best = c; }

    this.lastSearch = { pi, rootValue, sims: SIM_COUNTS[this.difficulty] };
    if (this.nerdy) this.renderNerdy();

    await this.playMove(best, -this.humanPlayer);
    if (this.game.isTerminal()) { this.finishGame(); return; }
    this.state = "human";
    this.setStatus("Your turn — click a column.");
  }

  async playMove(col, player) {
    this.state = "animating";
    // Preview piece falling via CSS animation on the placed piece
    const placedRow = this.game.makeMove(col);
    await this.renderDrop(placedRow, col, player);
  }

  finishGame() {
    this.state = "gameover";
    const winner = this.game.checkWinner();
    const line = this.game.getWinningLine();
    if (line) this.highlightWinningLine(line);
    let msg, cls;
    if (winner === this.humanPlayer) { msg = "You win!"; cls = "win"; }
    else if (winner === -this.humanPlayer) { msg = "AlphaZero wins."; cls = "lose"; }
    else { msg = "Draw."; cls = "draw"; }
    this.setStatus(msg, cls);
    this.el.gameOver.hidden = false;
    this.el.gameOverMsg.textContent = msg;
    this.el.gameOverMsg.className = "c4-game-over-msg c4-go-" + cls;
  }

  // ---------- Rendering ----------

  setStatus(msg, cls = "") {
    this.el.status.textContent = msg;
    this.el.status.className = "c4-status" + (cls ? " c4-status-" + cls : "");
  }

  setHoverCol(col) {
    this.hoverCol = col;
    const validMoves = this.game.getValidMoves();
    this.root.querySelectorAll(".c4-hover-slot").forEach((el, i) => {
      el.classList.toggle("c4-hover-active", col === i && this.state === "human" && validMoves[i]);
      if (col === i && this.state === "human" && validMoves[i]) {
        el.style.setProperty("--piece-color", COLOR[this.humanPlayer]);
      }
    });
  }

  render() {
    this.root.querySelectorAll(".c4-cell").forEach(cell => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const v = this.game.cell(r, c);
      const piece = cell.querySelector(".c4-piece");
      piece.className = "c4-piece";
      piece.style.removeProperty("--piece-color");
      if (v !== 0) {
        piece.classList.add("c4-piece-placed");
        piece.style.setProperty("--piece-color", COLOR[v]);
      }
    });
    this.setHoverCol(null);
  }

  renderDrop(row, col, player) {
    return new Promise(resolve => {
      const cell = this.root.querySelector(`.c4-cell[data-row="${row}"][data-col="${col}"]`);
      const piece = cell.querySelector(".c4-piece");
      piece.className = "c4-piece c4-piece-placed c4-piece-drop";
      piece.style.setProperty("--piece-color", COLOR[player]);
      piece.style.setProperty("--drop-distance", `${(row + 1) * 115}%`);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        piece.classList.remove("c4-piece-drop");
        piece.removeEventListener("animationend", done);
        resolve();
      };
      piece.addEventListener("animationend", done);
      // Safety net: if animationend never fires (rare), resolve anyway.
      setTimeout(done, 450);
    });
  }

  highlightWinningLine(line) {
    for (const [r, c] of line) {
      const cell = this.root.querySelector(`.c4-cell[data-row="${r}"][data-col="${c}"]`);
      cell.querySelector(".c4-piece").classList.add("c4-piece-win");
    }
  }

  // ---------- Nerdy mode ----------

  resetSimProgress() {
    this.el.simBarFill.style.width = "0%";
    this.el.simLabel.textContent = "";
  }

  showSimProgress(show) {
    this.el.simBar.hidden = !show;
    this.el.simLabel.hidden = !show;
    if (!show) this.resetSimProgress();
  }

  onSimProgress(n, total) {
    const pct = (n / total) * 100;
    this.el.simBarFill.style.width = pct + "%";
    this.el.simLabel.textContent = `${n} / ${total} sims`;
  }

  renderNerdy() {
    if (!this.nerdy) return;
    if (!this.lastSearch) {
      this.el.nerdyHeading.textContent = "Waiting for AlphaZero's first move";
      this.el.nerdyNote.textContent = "This panel updates each time AlphaZero plays, showing the MCTS visit distribution and position value it arrived at.";
      this.el.valuePerspective.textContent = "";
      this.renderPolicy(new Array(COLS).fill(0));
      this.el.valueFill.style.width = "0%";
      this.el.valueLabel.textContent = "—";
      this.el.valueFill.classList.remove("c4-value-positive", "c4-value-negative");
      return;
    }
    const { pi, rootValue, sims } = this.lastSearch;
    this.el.nerdyHeading.textContent = `AlphaZero's last move (${sims} MCTS sims)`;
    this.el.nerdyNote.textContent = "Column probabilities = MCTS visit counts — tall bar = most-searched move. Value is AlphaZero's position estimate at its own turn.";
    this.el.valuePerspective.textContent = "(AlphaZero's perspective)";
    this.renderPolicy(pi);
    this.renderValue(rootValue);
  }

  renderPolicy(probs) {
    let maxIdx = 0, maxV = -1;
    for (let c = 0; c < COLS; c++) if (probs[c] > maxV) { maxV = probs[c]; maxIdx = c; }
    for (let c = 0; c < COLS; c++) {
      const inner = this.el.policyBars.querySelector(`.c4-policy-inner[data-col="${c}"]`);
      const val = this.el.policyBars.querySelector(`.c4-policy-val[data-col="${c}"]`);
      const pct = (probs[c] || 0) * 100;
      inner.style.height = pct.toFixed(1) + "%";
      inner.classList.toggle("c4-policy-best", c === maxIdx && probs[c] > 0);
      val.textContent = probs[c] > 0 ? pct.toFixed(0) + "%" : "—";
    }
  }

  renderValue(v) {
    // v in [-1, 1]. Fill bar extends from center left/right based on sign.
    const widthPct = Math.min(Math.abs(v), 1) * 50;
    this.el.valueFill.style.width = widthPct.toFixed(1) + "%";
    if (v >= 0) {
      this.el.valueFill.style.left = "50%";
      this.el.valueFill.style.right = "auto";
    } else {
      this.el.valueFill.style.left = "auto";
      this.el.valueFill.style.right = "50%";
    }
    this.el.valueLabel.textContent = (v >= 0 ? "+" : "") + v.toFixed(3);
    this.el.valueFill.classList.toggle("c4-value-positive", v > 0.05);
    this.el.valueFill.classList.toggle("c4-value-negative", v < -0.05);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("c4-app");
  if (root) new ConnectFourApp(root);
});
