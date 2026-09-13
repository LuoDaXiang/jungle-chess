const test = require('node:test');
const assert = require('node:assert');
const J = require('../engine.js');
const { LESSONS, VOICE } = require('../lessons.js');

const at = (p) => J.idx(p[0], p[1]);

function startOf(step) {
  return step.setup ? J.makePosition(step.setup, step.turn || 'red') : J.createGame();
}

// Breadth-first over red moves only, with black frozen. Enough to prove the
// goal of a lesson step is actually reachable from the position I typed in.
function reachable(step, predicate, maxDepth) {
  let frontier = [startOf(step)];
  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    for (const s of frontier) {
      for (const mv of J.legalMoves(s, 'red')) {
        const c = { board: s.board.slice(), turn: 'red', winner: null, history: [] };
        J.applyMove(c, mv.from, mv.to);
        if (predicate(c, mv)) return true;
        c.turn = 'red';
        c.winner = null;
        next.push(c);
      }
    }
    frontier = next;
    if (!frontier.length || frontier.length > 30000) break;
  }
  return false;
}

test('every lesson step declares a goal the engine can actually satisfy', () => {
  for (const L of LESSONS) {
    L.steps.forEach((step, si) => {
      const where = `${L.id} step ${si + 1}`;
      const g = step.goal;

      if (g.type === 'play') return; // free game, nothing to prove

      const s0 = startOf(step);
      assert.ok(J.legalMoves(s0, 'red').length > 0 || g.type === 'inspect',
        `${where}: red has no legal move at all`);

      if (g.type === 'inspect') {
        const reds = step.setup.filter((p) => p.side === 'red');
        assert.strictEqual(reds.length, 8, `${where}: inspect needs all 8 pieces`);
        const ranks = new Set(reds.map((p) => p.rank));
        assert.strictEqual(ranks.size, 8, `${where}: duplicate ranks in inspect setup`);
        for (const p of reds) {
          assert.ok(step.pieceLines && step.pieceLines[p.rank],
            `${where}: no voice line for ${p.rank}`);
        }
        return;
      }

      if (g.type === 'capture') {
        const target = at(g.target);
        assert.ok(s0.board[target] && s0.board[target].side === 'black',
          `${where}: capture target is not a black piece`);
        assert.ok(reachable(step, (_, mv) => mv.to === target, 3),
          `${where}: capture target unreachable`);
      } else if (g.type === 'move') {
        const target = at(g.to);
        assert.ok(reachable(step, (_, mv) => mv.to === target, 3),
          `${where}: move target unreachable`);
      } else if (g.type === 'den') {
        const den = J.DEN.black;
        assert.ok(reachable(step, (c) => c.board[den] && c.board[den].side === 'red', 4),
          `${where}: black den unreachable`);
      } else if (g.type === 'safeMove') {
        const banned = g.forbidden.map(at);
        const options = J.legalMoves(s0, 'red').filter((m) => !banned.includes(m.to));
        assert.ok(options.length > 0, `${where}: no safe move exists`);
      } else {
        assert.fail(`${where}: unknown goal type ${g.type}`);
      }
    });
  }
});

test('every hint is on a square the UI will actually intercept', () => {
  // A hint fires on one of two paths: the square is an illegal destination
  // (the piece shakes), or it is a legal-but-wrong square listed in a
  // safeMove goal (the move is played, explained, then rewound). A hint on
  // any other square is dead content.
  for (const L of LESSONS) {
    L.steps.forEach((step, si) => {
      if (!step.hints) return;
      const s0 = startOf(step);
      const allLegal = new Set(J.legalMoves(s0, 'red').map((m) => m.to));
      const forbidden = new Set(
        step.goal.type === 'safeMove' ? step.goal.forbidden.map(at) : []
      );
      for (const h of step.hints) {
        const sq = at(h.at);
        assert.ok(!allLegal.has(sq) || forbidden.has(sq),
          `${L.id} step ${si + 1}: hint at ${h.at} is legal but not intercepted, so it never fires`);
      }
    });
  }
});

test('forbidden squares in safeMove steps are reachable-looking traps, not noise', () => {
  // A safeMove step is only meaningful if the child CAN make the wrong move
  // (it must be illegal) or the square is a rule trap they must learn to avoid.
  for (const L of LESSONS) {
    L.steps.forEach((step, si) => {
      if (step.goal.type !== 'safeMove') return;
      assert.ok(step.hints && step.hints.length,
        `${L.id} step ${si + 1}: safeMove without a hint teaches nothing`);
    });
  }
});

test('a voice key never carries two different scripts', () => {
  const seen = new Map();
  const visit = (line, where) => {
    if (!line || !line.key) return;
    if (seen.has(line.key)) {
      assert.strictEqual(seen.get(line.key).text, line.text,
        `voice key ${line.key} has two different scripts (${where})`);
    } else {
      seen.set(line.key, line);
    }
  };
  for (const L of LESSONS) {
    L.steps.forEach((step, si) => {
      const w = `${L.id}#${si + 1}`;
      visit(step.say, w);
      visit(step.success, w);
      (step.hints || []).forEach((h) => visit(h, w));
      Object.values(step.pieceLines || {}).forEach((l) => visit(l, w));
    });
  }
  Object.values(VOICE).forEach((l) => visit(l, 'ui'));
  assert.ok(seen.size > 20, 'expected a real script inventory');
});

test('every spoken line is non-empty and reasonably short for a six-year-old', () => {
  const lines = [];
  for (const L of LESSONS) {
    for (const step of L.steps) {
      [step.say, step.success].forEach((l) => l && lines.push(l));
      (step.hints || []).forEach((l) => lines.push(l));
      Object.values(step.pieceLines || {}).forEach((l) => lines.push(l));
    }
  }
  Object.values(VOICE).forEach((l) => lines.push(l));
  for (const l of lines) {
    assert.ok(l.text && l.text.trim().length > 0, `${l.key} has no script`);
    assert.ok(l.text.length <= 90, `${l.key} is ${l.text.length} chars, too long to listen to`);
  }
});

test('lesson 6 cannot be finished in one move, so the UI must allow several', () => {
  // Regression marker. The wolf has to step into the trap first and walk on
  // into the den next turn. applyMove hands the turn to black after every move,
  // but a lesson has no opponent — the UI has to hand it straight back or the
  // second click throws "not red's turn" and the lesson freezes. Any lesson
  // step also needs this after a wrong-but-legal move.
  const step = LESSONS.find((L) => L.id === 'l6').steps[0];
  const s0 = startOf(step);
  const inOne = J.legalMoves(s0, 'red').some((m) => J.isDen(m.to, 'black'));
  assert.ok(!inOne, 'lesson 6 step 1 must still require more than one move');
  assert.ok(reachable(step, (c) => {
    const d = c.board[J.DEN.black];
    return d && d.side === 'red';
  }, 4), 'and the den must still be reachable in a few moves');
});
