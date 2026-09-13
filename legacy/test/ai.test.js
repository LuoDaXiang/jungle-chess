const test = require('node:test');
const assert = require('node:assert');
const J = require('../engine.js');
const AI = require('../ai.js');

const at = (c, r) => J.idx(c, r);
const p = (c, r, rank, side) => ({ c, r, rank, side });

// Deterministic rng so level 1 is reproducible in tests.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/*
 * depths: optional {level: plies} pinning each side's search depth.
 * A ladder measured against the clock is not reproducible — machine load
 * changes how deep a tier gets, and the same seed can flip a game. Depth is
 * what actually makes one tier stronger, so the ladder is tested on depth.
 */
function playGame(levelRed, levelBlack, maxPlies, seed, depths) {
  const g = J.createGame();
  const rng = seeded(seed);
  let plies = 0;
  while (!g.winner && plies < maxPlies) {
    const level = g.turn === 'red' ? levelRed : levelBlack;
    const opts = { rng };
    if (depths && depths[level]) {
      opts.fixedDepth = depths[level];
      opts.budgetMs = 60000;   // effectively no clock: depth decides
    }
    const mv = AI.chooseMove(g, level, opts);
    if (!mv) break;
    J.applyMove(g, mv.from, mv.to);
    plies++;
  }
  return { winner: g.winner, plies };
}

// Play both colours so the result is not just red's first-move advantage.
function duel(strong, weak, games, maxPlies, depths) {
  let strongWins = 0, weakWins = 0, drawn = 0;
  for (let i = 0; i < games; i++) {
    const strongIsRed = i % 2 === 0;
    const r = strongIsRed
      ? playGame(strong, weak, maxPlies, 100 + i, depths)
      : playGame(weak, strong, maxPlies, 100 + i, depths);
    const strongSide = strongIsRed ? 'red' : 'black';
    if (r.winner === strongSide) strongWins++;
    else if (r.winner === 'draw' || !r.winner) drawn++;
    else weakWins++;
  }
  return { strongWins, weakWins, drawn };
}

for (const level of [1, 2, 3, 4, 5]) {
  test(`level ${level} only ever returns a legal move`, () => {
    const g = J.createGame();
    const rng = seeded(42 + level);
    for (let i = 0; i < 40 && !g.winner; i++) {
      const mv = AI.chooseMove(g, level, { rng });
      assert.ok(mv, 'AI must produce a move while the game is live');
      assert.ok(
        J.legalMovesFrom(g, mv.from).includes(mv.to),
        `level ${level} produced an illegal move at ply ${i}`
      );
      J.applyMove(g, mv.from, mv.to);
    }
  });

  test(`level ${level} respects its time budget`, () => {
    const g = J.createGame();
    const budget = AI.TIME_BUDGET_MS[level];
    const start = Date.now();
    AI.chooseMove(g, level, { rng: seeded(7) });
    const spent = Date.now() - start;
    // Budget is checked between nodes, so allow slack for one deep node.
    assert.ok(spent < budget * 4 + 250,
      `level ${level} took ${spent}ms against a ${budget}ms budget`);
  });

  test(`level ${level} takes an immediate win into the den`, () => {
    const s = J.makePosition([
      p(3, 1, 'wolf', 'red'),
      p(0, 8, 'lion', 'black'),
      p(6, 6, 'rat', 'black')
    ], 'red');
    const mv = AI.chooseMove(s, level, { rng: seeded(3) });
    assert.deepStrictEqual(mv, { from: at(3, 1), to: at(3, 0) },
      `level ${level} walked past a winning den entry`);
  });
}

test('level 1 does not hand over a piece for free', () => {
  // Red wolf can step next to a black lion (loses it) or stay safe.
  const s = J.makePosition([
    p(3, 4, 'wolf', 'red'),
    p(3, 2, 'lion', 'black'),
    p(0, 0, 'cat', 'black')
  ], 'red');
  const rng = seeded(11);
  for (let i = 0; i < 30; i++) {
    const mv = AI.chooseMove(s, 1, { rng });
    assert.notDeepStrictEqual(mv, { from: at(3, 4), to: at(3, 3) },
      'level 1 stepped into the lion');
  }
});

test('hangsPiece flags a free loss and clears an even trade', () => {
  const bad = J.makePosition([p(3, 4, 'wolf', 'red'), p(3, 2, 'lion', 'black')], 'red');
  assert.ok(AI.hangsPiece(bad, { from: at(3, 4), to: at(3, 3) }), 'wolf into lion hangs');

  // Taking a piece of equal value is a trade, not a hang, even when the
  // capturer can be taken back afterwards.
  const even = J.makePosition([
    p(3, 3, 'wolf', 'red'), p(3, 2, 'wolf', 'black'), p(3, 1, 'lion', 'black')
  ], 'red');
  assert.ok(!AI.hangsPiece(even, { from: at(3, 3), to: at(3, 2) }),
    'wolf takes wolf is an even trade');
});

test('evaluate rewards material and prefers being near the enemy den', () => {
  const even = J.makePosition([p(3, 4, 'wolf', 'red'), p(3, 2, 'wolf', 'black')], 'red');
  assert.strictEqual(AI.evaluate(even, 'red'), AI.evaluate(even, 'black') * -1 + 0,
    'evaluation must be symmetric');

  const up = J.makePosition([p(3, 4, 'wolf', 'red'), p(3, 2, 'cat', 'black')], 'red');
  assert.ok(AI.evaluate(up, 'red') > 0, 'a wolf against a cat is winning for red');

  const far = J.makePosition([p(3, 8, 'wolf', 'red')], 'red');
  const near = J.makePosition([p(3, 2, 'wolf', 'red')], 'red');
  assert.ok(AI.evaluate(near, 'red') > AI.evaluate(far, 'red'),
    'closer to the black den scores higher');
});

// ---- search machinery: the make/unmake path replaced board cloning ----

test('unmakeMove restores the board exactly, captures and collisions included', () => {
  const cases = [
    ['plain move',     [p(3, 4, 'wolf', 'red'), p(0, 0, 'cat', 'black')], at(3, 4), at(3, 5)],
    ['capture',        [p(3, 4, 'wolf', 'red'), p(3, 3, 'cat', 'black')], at(3, 4), at(3, 3)],
    ['mutual kill',    [p(3, 4, 'wolf', 'red'), p(3, 3, 'wolf', 'black'), p(0, 0, 'cat', 'black')], at(3, 4), at(3, 3)],
    ['trapped defender', [p(2, 7, 'cat', 'red'), p(2, 8, 'lion', 'black'), p(0, 0, 'dog', 'black')], at(2, 7), at(2, 8)]
  ];
  for (const [label, pieces, from, to] of cases) {
    const st = AI._toSearch(J.makePosition(pieces, 'red'));
    const before = JSON.stringify(st);
    const u = AI._makeMove(st, from, to);
    assert.notStrictEqual(JSON.stringify(st), before, `${label}: move did nothing`);
    AI._unmakeMove(st, u);
    assert.strictEqual(JSON.stringify(st), before, `${label}: board not restored`);
  }
});

test('piece counts stay correct through a capture and a collision', () => {
  const st = AI._toSearch(J.makePosition([
    p(3, 4, 'wolf', 'red'), p(3, 3, 'wolf', 'black'), p(0, 0, 'cat', 'black')
  ], 'red'));
  assert.deepStrictEqual([st.red, st.black], [1, 2]);
  const u = AI._makeMove(st, at(3, 4), at(3, 3));   // equal ranks: both die
  assert.deepStrictEqual([st.red, st.black], [0, 1], 'a collision removes one from each side');
  AI._unmakeMove(st, u);
  assert.deepStrictEqual([st.red, st.black], [1, 2]);
});

test('terminalScore is written from the MOVER point of view', () => {
  // Negating this by mistake told the search that winning was the worst
  // outcome, and every game between two engines ran to the move limit.
  const st = AI._toSearch(J.makePosition([
    p(3, 1, 'wolf', 'red'), p(0, 0, 'cat', 'black')
  ], 'red'));
  const u = AI._makeMove(st, at(3, 1), at(3, 0));   // into the black den
  const score = AI._terminalScore(st, u);
  assert.ok(score !== null && score > 0,
    `entering the enemy den must score as a WIN for the mover, got ${score}`);

  const st2 = AI._toSearch(J.makePosition([
    p(3, 4, 'wolf', 'red'), p(3, 3, 'cat', 'black')
  ], 'red'));
  const u2 = AI._makeMove(st2, at(3, 4), at(3, 3));  // takes the last black piece
  assert.ok(AI._terminalScore(st2, u2) > 0, 'clearing the board is a win for the mover');
});

test('every tier has a distinct configuration', () => {
  const seen = new Set();
  for (let L = 1; L <= AI.MAX_LEVEL; L++) {
    const sig = [AI.DEPTH[L], AI.TIME_BUDGET_MS[L], AI.QUIET[L], AI.USE_TT[L]].join('|');
    assert.ok(!seen.has(sig), `level ${L} is a duplicate of a lower tier`);
    seen.add(sig);
  }
  // Each axis must be non-decreasing, and time must actually escalate.
  for (let L = 2; L <= AI.MAX_LEVEL; L++) {
    assert.ok(AI.DEPTH[L] >= AI.DEPTH[L - 1], `depth dropped at level ${L}`);
    assert.ok(AI.QUIET[L] >= AI.QUIET[L - 1], `quiescence dropped at level ${L}`);
    assert.ok(AI.TIME_BUDGET_MS[L] > AI.TIME_BUDGET_MS[L - 1] * 2,
      `level ${L} thinking time is not a real step up from level ${L - 1}`);
  }
});

/*
 * The whole point of adding tiers: each must actually beat the one below.
 *
 * Compared at PINNED depths (a clock-based ladder is not reproducible), and
 * only between depths of the SAME PARITY. Odd-depth searches end on their own
 * move and systematically overrate the position, which makes them play more
 * aggressively — measured here, depth 3 beat depth 4 three games to nil. The
 * shipped tiers all use even depths (2/4/6/8) precisely to avoid that.
 */
test('the difficulty ladder holds: deeper search beats shallower', { timeout: 900000 }, () => {
  const report = [];

  // Tier 1 does no search, so it is measured on its real configuration.
  const base = duel(2, 1, 6, 160, null);
  report.push(`L2 vs L1: ${base.strongWins}W ${base.weakWins}L ${base.drawn}D`);
  assert.strictEqual(base.weakWins, 0, 'level 1 beat level 2 — ' + report.join(' | '));
  assert.ok(base.strongWins > 0, 'level 2 never converted — ' + report.join(' | '));

  const rungs = [
    { strong: 3, weak: 2, games: 6, plies: 140, depths: { 3: 4, 2: 2 } },
    { strong: 4, weak: 3, games: 4, plies: 120, depths: { 4: 6, 3: 4 } }
  ];
  for (const r of rungs) {
    const res = duel(r.strong, r.weak, r.games, r.plies, r.depths);
    const d = r.depths;
    report.push(`d${d[r.strong]} vs d${d[r.weak]}: ` +
                `${res.strongWins}W ${res.weakWins}L ${res.drawn}D`);
    // Losses are the real signal; draws are mostly the ply cap.
    assert.strictEqual(res.weakWins, 0,
      'the shallower search won a game — ' + report.join(' | '));
    assert.ok(res.strongWins > 0,
      'the deeper search never converted — ' + report.join(' | '));
  }
  console.log('    ladder → ' + report.join('  |  '));
});

/*
 * Tier 5 over tier 4 cannot be shown the same way: it would need depth 8 vs 6
 * with no clock, which takes minutes per move. What tier 5 actually buys is
 * null-move pruning, so the claim to verify is that it reaches the SAME depth
 * for less work — which is what lets it go deeper inside the same 3 seconds.
 */
test('tier 5 reaches a given depth cheaper than tier 4', { timeout: 120000 }, () => {
  const g = J.createGame();
  const rng = seeded(9);
  for (let i = 0; i < 10 && !g.winner; i++) {
    const mv = AI.chooseMove(g, 2, { rng });
    if (!mv) break;
    J.applyMove(g, mv.from, mv.to);
  }

  const timeAt = (level) => {
    const t0 = Date.now();
    AI.chooseMove(g, level, { fixedDepth: 6, budgetMs: 120000 });
    return Date.now() - t0;
  };
  timeAt(4);                       // warm up, discard
  const t4 = timeAt(4);
  const t5 = timeAt(5);
  assert.ok(AI.NULLMOVE[5] && !AI.NULLMOVE[4], 'tier 5 is the one with pruning');
  assert.ok(t5 <= t4,
    `tier 5 should reach depth 6 no slower than tier 4 (t4=${t4}ms, t5=${t5}ms)`);
  console.log(`    depth 6 cost → tier 4: ${t4}ms, tier 5: ${t5}ms`);
});

test('positionKey separates positions that differ only by side to move', () => {
  const g = J.createGame();
  const a = AI.positionKey(g.board, 'red');
  const b = AI.positionKey(g.board, 'black');
  assert.notStrictEqual(a, b);
  const g2 = J.createGame();
  assert.strictEqual(AI.positionKey(g2.board, 'red'), a, 'same position, same key');
});
