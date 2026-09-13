const test = require('node:test');
const assert = require('node:assert');
const J = require('../engine.js');

const at = (c, r) => J.idx(c, r);
const pos = (pieces, turn) => J.makePosition(pieces, turn);
const p = (c, r, rank, side) => ({ c, r, rank, side });
const canMove = (s, from, to) => J.legalMovesFrom(s, from).includes(to);

test('opening layout places 16 pieces with lions and tigers on opposite corners', () => {
  const g = J.createGame();
  assert.strictEqual(g.board.filter(Boolean).length, 16);
  assert.deepStrictEqual(g.board[at(0, 0)], { rank: J.RANK.lion, side: 'black' });
  assert.deepStrictEqual(g.board[at(6, 0)], { rank: J.RANK.tiger, side: 'black' });
  assert.deepStrictEqual(g.board[at(0, 8)], { rank: J.RANK.tiger, side: 'red' });
  assert.deepStrictEqual(g.board[at(6, 8)], { rank: J.RANK.lion, side: 'red' });
  assert.strictEqual(g.turn, 'red');
});

// --- edge case 1: only the rat may enter the water ---
test('rat enters water, dog does not', () => {
  const s = pos([p(1, 2, 'rat', 'red'), p(2, 2, 'dog', 'red')], 'red');
  assert.ok(canMove(s, at(1, 2), at(1, 3)), 'rat should step into the pool');
  assert.ok(!canMove(s, at(2, 2), at(2, 3)), 'dog must not enter the pool');
});

// --- edge case 2: a rat in the water is sealed off from the land, both ways ---
test('rat in water cannot capture on land and cannot be captured from land', () => {
  const s = pos([p(1, 3, 'rat', 'red'), p(1, 2, 'cat', 'black')], 'red');
  assert.ok(!J.canCapture(s, at(1, 3), at(1, 2)), 'wet rat must not eat a cat on land');
  assert.ok(!canMove(s, at(1, 3), at(1, 2)));
  s.turn = 'black';
  assert.ok(!J.canCapture(s, at(1, 2), at(1, 3)), 'cat on land must not eat a wet rat');
  assert.ok(!canMove(s, at(1, 2), at(1, 3)));
});

// --- edge case 3: the same rat CAN be taken by another rat inside the water ---
test('rat meets rat inside the water and both are destroyed', () => {
  // (1,4) and (5,4) are crocodile squares now, so this uses column 2.
  const s = pos([p(2, 3, 'rat', 'red'), p(2, 4, 'rat', 'black')], 'red');
  assert.ok(canMove(s, at(2, 3), at(2, 4)), 'wet rat vs wet rat is a legal collision');
  J.applyMove(s, at(2, 3), at(2, 4));
  assert.strictEqual(s.board[at(2, 4)], null, 'defender is gone');
  assert.strictEqual(s.board[at(2, 3)], null, 'attacker is gone too');
  assert.strictEqual(s.winner, 'draw', 'both sides ran out of pieces at once');
});

// ---- crocodiles: fixed terrain in the middle row of each pool ----
test('crocodiles sit at (1,4) and (5,4) and are not pieces', () => {
  const g = J.createGame();
  assert.ok(J.isCroc(at(1, 4)) && J.isCroc(at(5, 4)));
  assert.ok(J.isWater(at(1, 4)) && J.isWater(at(5, 4)), 'they live in the water');
  assert.strictEqual(g.board[at(1, 4)], null, 'a crocodile never occupies a board slot');
  assert.ok(!J.isCroc(at(2, 4)) && !J.isCroc(at(4, 4)), 'only the outer middle squares');
});

test('the rat cannot swim through a crocodile but can go around it', () => {
  const s = pos([p(1, 3, 'rat', 'red')], 'red');
  assert.ok(!canMove(s, at(1, 3), at(1, 4)), 'crocodile blocks the rat');
  assert.ok(canMove(s, at(1, 3), at(2, 3)), 'the way around is open');
  const below = pos([p(1, 5, 'rat', 'red')], 'red');
  assert.ok(!canMove(below, at(1, 5), at(1, 4)), 'blocked from the other side too');
});

test('lions and tigers leap straight over a crocodile', () => {
  // Horizontal leap along row 4 crosses both crocodile squares.
  const h = pos([p(0, 4, 'lion', 'red')], 'red');
  assert.ok(canMove(h, at(0, 4), at(3, 4)), 'row 4 leap passes over the crocodile');
  // Vertical leap down column 1 passes through (1,4).
  const v = pos([p(1, 2, 'tiger', 'red')], 'red');
  assert.ok(canMove(v, at(1, 2), at(1, 6)), 'column 1 leap passes over the crocodile');
});

test('a rat still blocks a leap even on a crocodile column', () => {
  const s = pos([p(1, 2, 'tiger', 'red'), p(1, 3, 'rat', 'black')], 'red');
  assert.ok(!canMove(s, at(1, 2), at(1, 6)), 'the rat blocks, crocodile or not');
});

// ---- equal ranks destroy each other ----
test('equal ranks annihilate instead of one taking the square', () => {
  const s = pos([
    p(3, 4, 'lion', 'red'), p(0, 8, 'cat', 'red'),
    p(3, 3, 'lion', 'black'), p(0, 0, 'cat', 'black')
  ], 'red');
  assert.ok(J.isMutualKill(s, at(3, 4), at(3, 3)));
  J.applyMove(s, at(3, 4), at(3, 3));
  assert.strictEqual(s.board[at(3, 3)], null, 'defending lion is gone');
  assert.strictEqual(s.board[at(3, 4)], null, 'attacking lion is gone');
  assert.strictEqual(s.winner, null, 'both sides still have a cat, game continues');
  assert.strictEqual(s.turn, 'black');
});

test('spending your last piece on a collision loses the game', () => {
  // Worth locking in: a mutual kill removes YOUR piece too, so trading off
  // your final piece hands the win to the other side.
  const s = pos([
    p(3, 4, 'lion', 'red'), p(3, 3, 'lion', 'black'), p(0, 0, 'cat', 'black')
  ], 'red');
  J.applyMove(s, at(3, 4), at(3, 3));
  assert.strictEqual(s.winner, 'black', 'red traded away its only piece');
});

test('a trapped defender is a one-sided kill, not a collision', () => {
  // Black lion sits in a red trap, so its rank is 0 and the red lion survives.
  const s = pos([p(2, 8, 'lion', 'black'), p(2, 7, 'lion', 'red')], 'red');
  assert.ok(!J.isMutualKill(s, at(2, 7), at(2, 8)), 'rank 0 is not an equal fight');
  J.applyMove(s, at(2, 7), at(2, 8));
  assert.deepStrictEqual(s.board[at(2, 8)], { rank: J.RANK.lion, side: 'red' },
    'the red lion takes the square and lives');
  assert.strictEqual(s.winner, 'red');
});

test('rat and elephant is not a collision either way', () => {
  const s = pos([p(3, 4, 'rat', 'red'), p(3, 3, 'elephant', 'black')], 'red');
  assert.ok(!J.isMutualKill(s, at(3, 4), at(3, 3)), 'different ranks');
  J.applyMove(s, at(3, 4), at(3, 3));
  assert.deepStrictEqual(s.board[at(3, 3)], { rank: J.RANK.rat, side: 'red' },
    'the rat survives and takes the square');
});

test('trading off the last piece on each side is a draw', () => {
  const s = pos([p(3, 4, 'wolf', 'red'), p(3, 3, 'wolf', 'black')], 'red');
  J.applyMove(s, at(3, 4), at(3, 3));
  assert.strictEqual(s.winner, 'draw');
});

test('history records whether a capture was mutual', () => {
  const s = pos([
    p(3, 4, 'wolf', 'red'), p(3, 3, 'wolf', 'black'), p(0, 0, 'cat', 'black')
  ], 'red');
  J.applyMove(s, at(3, 4), at(3, 3));
  assert.strictEqual(s.history[0].mutual, true);
});

// --- edge case 4: surfacing does not grant a capture on the same turn ---
test('rat in the water cannot eat the elephant standing on the bank', () => {
  const s = pos([p(1, 3, 'rat', 'red'), p(0, 3, 'elephant', 'black')], 'red');
  assert.ok(!canMove(s, at(1, 3), at(0, 3)), 'must climb out first, capture next turn');
  assert.ok(canMove(s, at(1, 3), at(1, 2)), 'but climbing onto an empty bank is fine');
});

// --- edge case 5: the rat/elephant special case runs one way only ---
test('rat eats elephant on land, elephant never eats rat', () => {
  const s = pos([p(3, 4, 'rat', 'red'), p(3, 3, 'elephant', 'black')], 'red');
  assert.ok(canMove(s, at(3, 4), at(3, 3)), 'rat takes elephant on land');
  s.turn = 'black';
  assert.ok(!canMove(s, at(3, 3), at(3, 4)), 'elephant must not take the rat');
});

// --- edge case 6: trap rank-zeroing beats the rat/elephant special case ---
test('elephant eats a rat that stepped into the elephant side trap', () => {
  const s = pos([p(2, 8, 'rat', 'black'), p(2, 7, 'elephant', 'red')], 'red');
  assert.ok(J.isTrapOf(at(2, 8), 'red'));
  assert.ok(canMove(s, at(2, 7), at(2, 8)), 'in red trap the rat has no rank left');
});

// --- edge case 7: any piece may take an intruder sitting in your trap ---
test('cat eats an elephant sitting in the cat side trap', () => {
  const s = pos([p(2, 0, 'elephant', 'red'), p(2, 1, 'cat', 'black')], 'black');
  assert.ok(canMove(s, at(2, 1), at(2, 0)), 'trapped elephant is rank 0');
});

// --- edge case 8: rank comes back the moment the piece walks out ---
test('elephant regains rank after leaving the trap', () => {
  const s = pos([p(2, 0, 'elephant', 'red'), p(1, 0, 'dog', 'black')], 'black');
  assert.ok(canMove(s, at(1, 0), at(2, 0)), 'trapped elephant is edible by a dog');
  J.applyMove(s, at(1, 0), at(1, 1)); // dog steps aside instead of taking it
  J.applyMove(s, at(2, 0), at(2, 1)); // elephant walks out of the trap
  assert.ok(!canMove(s, at(1, 1), at(2, 1)), 'rank restored, the dog can no longer eat it');
});

// --- edge case 9: your own trap does nothing to your own pieces ---
test('own trap does not weaken your own piece', () => {
  const s = pos([p(2, 0, 'elephant', 'black'), p(2, 1, 'cat', 'red')], 'red');
  assert.ok(J.isTrapOf(at(2, 0), 'black'));
  assert.ok(!canMove(s, at(2, 1), at(2, 0)), 'black elephant in black trap keeps rank 8');
});

// --- edge case 10: lion and tiger leaps, and what blocks them ---
test('lion leaps the pool horizontally and vertically', () => {
  const s = pos([p(0, 3, 'lion', 'red'), p(1, 2, 'tiger', 'red')], 'red');
  assert.ok(canMove(s, at(0, 3), at(3, 3)), 'horizontal leap over columns 1-2');
  assert.ok(canMove(s, at(1, 2), at(1, 6)), 'vertical leap over rows 3-5');
});

test('a rat in the pool blocks the leap, whatever its colour', () => {
  const own = pos([p(0, 3, 'lion', 'red'), p(2, 3, 'rat', 'red')], 'red');
  assert.ok(!canMove(own, at(0, 3), at(3, 3)), 'friendly rat blocks');
  const foe = pos([p(0, 3, 'lion', 'red'), p(2, 3, 'rat', 'black')], 'red');
  assert.ok(!canMove(foe, at(0, 3), at(3, 3)), 'enemy rat blocks too');
});

test('leap capture follows the normal rank rules', () => {
  const weaker = pos([p(0, 3, 'lion', 'red'), p(3, 3, 'wolf', 'black')], 'red');
  assert.ok(canMove(weaker, at(0, 3), at(3, 3)), 'lion lands on a wolf and eats it');
  const stronger = pos([p(0, 3, 'tiger', 'red'), p(3, 3, 'elephant', 'black')], 'red');
  assert.ok(!canMove(stronger, at(0, 3), at(3, 3)), 'tiger cannot land on an elephant');
  const friendly = pos([p(0, 3, 'lion', 'red'), p(3, 3, 'wolf', 'red')], 'red');
  assert.ok(!canMove(friendly, at(0, 3), at(3, 3)), 'cannot land on your own piece');
});

// --- edge case 11: equal ranks trade ---
test('equal ranks may capture each other', () => {
  const s = pos([p(3, 3, 'wolf', 'red'), p(3, 2, 'wolf', 'black')], 'red');
  assert.ok(canMove(s, at(3, 3), at(3, 2)));
});

// --- edge case 12: dens ---
test('a piece may not enter its own den but wins by entering the other one', () => {
  const s = pos([p(3, 7, 'wolf', 'red')], 'red');
  assert.ok(!canMove(s, at(3, 7), at(3, 8)), 'red wolf must not enter the red den');

  const w = pos([p(3, 1, 'wolf', 'red')], 'red');
  J.applyMove(w, at(3, 1), at(3, 0));
  assert.strictEqual(w.winner, 'red', 'entering the black den wins');
});

// --- edge case 13: win by capturing everything ---
test('taking the last enemy piece ends the game', () => {
  const s = pos([p(3, 3, 'lion', 'red'), p(3, 2, 'cat', 'black')], 'red');
  J.applyMove(s, at(3, 3), at(3, 2));
  assert.strictEqual(s.winner, 'red');
});

// --- edge case 14: stalemate is a loss for the side that cannot move ---
test('a side with no legal move loses', () => {
  const s = pos([
    p(0, 0, 'cat', 'red'),
    p(1, 0, 'lion', 'black'),
    p(0, 2, 'tiger', 'black')
  ], 'black');
  J.applyMove(s, at(0, 2), at(0, 1)); // seals the red cat into the corner
  assert.strictEqual(J.legalMoves(s, 'red').length, 0);
  assert.strictEqual(s.winner, 'black');
});

// --- sanity: the opening position is playable and symmetric ---
test('opening position offers the same move count to both sides', () => {
  const g = J.createGame();
  const red = J.legalMoves(g, 'red').length;
  const black = J.legalMoves(g, 'black').length;
  assert.strictEqual(red, black);
  assert.ok(red > 0);
});

test('applyMove rejects moving out of turn and illegal destinations', () => {
  const g = J.createGame();
  assert.throws(() => J.applyMove(g, at(0, 0), at(0, 1)), /not black/);
  assert.throws(() => J.applyMove(g, at(0, 6), at(0, 4)), /illegal move/);
});
