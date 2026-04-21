export const ROWS = 6;
export const COLS = 7;
const WIN_LENGTH = 4;

export class Connect4 {
  constructor() {
    this.board = new Int8Array(ROWS * COLS);
    this.currentPlayer = 1;
    this.lastMove = null;
  }

  _idx(r, c) { return r * COLS + c; }
  cell(r, c) { return this.board[this._idx(r, c)]; }

  getValidMoves() {
    const valid = new Array(COLS);
    for (let c = 0; c < COLS; c++) valid[c] = this.board[c] === 0;
    return valid;
  }

  makeMove(col) {
    if (this.board[col] !== 0) throw new Error(`Column ${col} is full`);
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.cell(r, col) === 0) { row = r; break; }
    }
    this.board[this._idx(row, col)] = this.currentPlayer;
    this.lastMove = [row, col];
    this.currentPlayer *= -1;
    return row;
  }

  checkWinner() {
    if (!this.lastMove) return null;
    const [r, c] = this.lastMove;
    const player = this.cell(r, c);
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let count = 1;
      for (let i = 1; i < WIN_LENGTH; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.cell(nr, nc) === player) count++;
        else break;
      }
      for (let i = 1; i < WIN_LENGTH; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.cell(nr, nc) === player) count++;
        else break;
      }
      if (count >= WIN_LENGTH) return player;
    }
    return null;
  }

  isFull() {
    for (let c = 0; c < COLS; c++) if (this.board[c] === 0) return false;
    return true;
  }

  isTerminal() {
    return this.checkWinner() !== null || this.isFull();
  }

  getCanonicalBoard() {
    const out = new Float32Array(3 * ROWS * COLS);
    const p = this.currentPlayer;
    const plane = ROWS * COLS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = this.cell(r, c);
        const offset = r * COLS + c;
        if (v === p) out[offset] = 1.0;
        else if (v === -p) out[plane + offset] = 1.0;
      }
    }
    if (p === 1) out.fill(1.0, 2 * plane, 3 * plane);
    return out;
  }

  clone() {
    const c = new Connect4();
    c.board = new Int8Array(this.board);
    c.currentPlayer = this.currentPlayer;
    c.lastMove = this.lastMove ? [this.lastMove[0], this.lastMove[1]] : null;
    return c;
  }

  getWinningLine() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = this.cell(r, c);
        if (v === 0) continue;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          const line = [[r, c]];
          for (let i = 1; i < WIN_LENGTH; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.cell(nr, nc) === v) {
              line.push([nr, nc]);
            } else break;
          }
          if (line.length === WIN_LENGTH) return line;
        }
      }
    }
    return null;
  }
}
