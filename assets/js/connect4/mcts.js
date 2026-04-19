import { COLS } from "./game.js";

function maskedSoftmax(logits, validMoves) {
  const masked = logits.map((l, i) => (validMoves[i] ? l : -Infinity));
  let max = -Infinity;
  for (const v of masked) if (v > max) max = v;
  const exps = masked.map(v => (v === -Infinity ? 0 : Math.exp(v - max)));
  let sum = 0;
  for (const e of exps) sum += e;
  return exps.map(e => (sum > 0 ? e / sum : 0));
}

export async function predictNet(session, state) {
  const input = state.getCanonicalBoard();
  const tensor = new ort.Tensor("float32", input, [1, 3, 6, 7]);
  const out = await session.run({ board: tensor });
  const logits = Array.from(out.policy_logits.data);
  const value = out.value.data[0];
  const probs = maskedSoftmax(logits, state.getValidMoves());
  return { probs, value };
}

class MCTSNode {
  constructor(state, parent = null, actionTaken = null, prior = 0) {
    this.state = state;
    this.parent = parent;
    this.actionTaken = actionTaken;
    this.prior = prior;
    this.children = new Map();
    this.visitCount = 0;
    this.valueSum = 0;
  }

  get qValue() {
    return this.visitCount === 0 ? 0 : this.valueSum / this.visitCount;
  }

  isExpanded() { return this.children.size > 0; }

  selectChild(cPuct) {
    let bestScore = -Infinity, bestAction = -1, bestChild = null;
    const sqrtParent = Math.sqrt(this.visitCount);
    for (const [action, child] of this.children) {
      const puct = (-child.qValue) + cPuct * child.prior * sqrtParent / (1 + child.visitCount);
      if (puct > bestScore) {
        bestScore = puct;
        bestAction = action;
        bestChild = child;
      }
    }
    return [bestAction, bestChild];
  }

  expand(policy, validMoves) {
    for (let a = 0; a < policy.length; a++) {
      if (validMoves[a]) {
        const childState = this.state.clone();
        childState.makeMove(a);
        this.children.set(a, new MCTSNode(childState, this, a, policy[a]));
      }
    }
  }

  backpropagate(value) {
    let node = this;
    let v = value;
    while (node) {
      node.visitCount += 1;
      node.valueSum += v;
      v = -v;
      node = node.parent;
    }
  }
}

export class MCTS {
  constructor(session, { numSimulations = 200, cPuct = 2.0, onProgress = null } = {}) {
    this.session = session;
    this.numSimulations = numSimulations;
    this.cPuct = cPuct;
    this.onProgress = onProgress;
  }

  async search(state) {
    const root = new MCTSNode(state);
    const rootPred = await predictNet(this.session, state);
    root.expand(rootPred.probs, state.getValidMoves());

    for (let sim = 0; sim < this.numSimulations; sim++) {
      let node = root;
      while (node.isExpanded() && !node.state.isTerminal()) {
        [, node] = node.selectChild(this.cPuct);
      }

      let value;
      if (node.state.isTerminal()) {
        const winner = node.state.checkWinner();
        value = winner === null ? 0 : -1.0;
      } else {
        const pred = await predictNet(this.session, node.state);
        node.expand(pred.probs, node.state.getValidMoves());
        value = pred.value;
      }
      node.backpropagate(value);

      if (this.onProgress && (sim % 5 === 4 || sim === this.numSimulations - 1)) {
        this.onProgress(sim + 1, this.numSimulations);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const visits = new Array(COLS).fill(0);
    for (const [action, child] of root.children) visits[action] = child.visitCount;
    const total = visits.reduce((a, b) => a + b, 0);
    const pi = total > 0 ? visits.map(v => v / total) : visits;

    return { pi, visits, rootValue: root.qValue, rootPriors: rootPred.probs };
  }
}
