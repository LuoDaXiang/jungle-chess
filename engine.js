/*
 * Jungle Chess (斗兽棋) rule engine.
 *
 * UMD wrapper on purpose: the game ships as a static page opened via file://,
 * where <script type="module"> is blocked by CORS. Plain script + global it is.
 * The same file is require()'d by the Node test suite.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Jungle = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLS = 7;
  var ROWS = 9;

  // Rank order: rat is weakest by number, but beats the elephant (special case).
  var RANK = {
    rat: 1, cat: 2, dog: 3, wolf: 4,
    leopard: 5, tiger: 6, lion: 7, elephant: 8
  };

  // Display names. The child can read these characters; everything else is spoken.
  var NAME_CN = [null, '鼠', '猫', '犬', '狼', '豹', '虎', '狮', '象'];
  var KEY_BY_RANK = [null, 'rat', 'cat', 'dog', 'wolf', 'leopard', 'tiger', 'lion', 'elephant'];

  function idx(c, r) { return r * COLS + c; }
  function colOf(i) { return i % COLS; }
  function rowOf(i) { return Math.floor(i / COLS); }
  function inBoard(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

  // Two 2x3 pools: columns 1-2 and 4-5, rows 3-5.
  var WATER = (function () {
    var s = {};
    [1, 2, 4, 5].forEach(function (c) {
      [3, 4, 5].forEach(function (r) { s[idx(c, r)] = true; });
    });
    return s;
  })();

  // A trap belongs to the side whose den it guards.
  var TRAP = {
    black: { }, // guards the black den at (3,0)
    red: { }    // guards the red den at (3,8)
  };
  [[2, 0], [4, 0], [3, 1]].forEach(function (p) { TRAP.black[idx(p[0], p[1])] = true; });
  [[2, 8], [4, 8], [3, 7]].forEach(function (p) { TRAP.red[idx(p[0], p[1])] = true; });

  var DEN = { black: idx(3, 0), red: idx(3, 8) };

  /*
   * Fixed crocodiles sit in the middle row of each pool. They are terrain, not
   * pieces: they never enter `board`, so nothing can capture them, nothing can
   * stand on them, and — because the leap check only looks for pieces on the
   * board — lions and tigers jump straight over them. The one thing they do is
   * block the rat, which is the only piece that can be in the water at all.
   */
  var CROC = {};
  [[1, 4], [5, 4]].forEach(function (p) { CROC[idx(p[0], p[1])] = true; });

  var DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  function isWater(i) { return WATER[i] === true; }
  function isCroc(i) { return CROC[i] === true; }
  function isDen(i, side) { return DEN[side] === i; }
  function isTrapOf(i, side) { return TRAP[side][i] === true; }
  function opponent(side) { return side === 'red' ? 'black' : 'red'; }

  function piece(rank, side) { return { rank: rank, side: side }; }

  // Standard opening layout. Row 0 is black's back rank, row 8 is red's.
  var LAYOUT = [
    [0, 0, RANK.lion, 'black'], [6, 0, RANK.tiger, 'black'],
    [1, 1, RANK.dog, 'black'], [5, 1, RANK.cat, 'black'],
    [0, 2, RANK.rat, 'black'], [2, 2, RANK.leopard, 'black'],
    [4, 2, RANK.wolf, 'black'], [6, 2, RANK.elephant, 'black'],

    [0, 6, RANK.elephant, 'red'], [2, 6, RANK.wolf, 'red'],
    [4, 6, RANK.leopard, 'red'], [6, 6, RANK.rat, 'red'],
    [1, 7, RANK.cat, 'red'], [5, 7, RANK.dog, 'red'],
    [0, 8, RANK.tiger, 'red'], [6, 8, RANK.lion, 'red']
  ];

  function createGame() {
    var board = new Array(COLS * ROWS).fill(null);
    LAYOUT.forEach(function (e) {
      board[idx(e[0], e[1])] = piece(e[2], e[3]);
    });
    return { board: board, turn: 'red', winner: null, history: [] };
  }

  /*
   * Capture legality. Order matters:
   * the trap check must come before the elephant/rat special case, because a rat
   * standing in the attacker's own trap has rank 0 and IS edible by an elephant.
   */
  function canCapture(state, fromIdx, toIdx) {
    var a = state.board[fromIdx];
    var d = state.board[toIdx];
    if (!a || !d) return false;
    if (a.side === d.side) return false;

    var aWet = isWater(fromIdx);
    var dWet = isWater(toIdx);

    // A rat in the water neither eats nor is eaten by anything on land.
    // Rat vs rat inside the water is allowed.
    if (aWet !== dWet) return false;

    // Defender standing in a trap belonging to the attacker's side is rank 0.
    if (isTrapOf(toIdx, a.side)) return true;

    if (a.rank === RANK.rat && d.rank === RANK.elephant) return true;
    if (a.rank === RANK.elephant && d.rank === RANK.rat) return false;

    return a.rank >= d.rank; // equal ranks may trade
  }

  /*
   * Equal ranks destroy each other instead of one taking the square.
   *
   * Exception: a piece that stepped into the trap guarding the mover's own den
   * has rank 0. Whoever comes for it kills it and survives on that square, even
   * at equal rank. Collisions only happen between two pieces at full strength.
   */
  function isMutualKill(state, fromIdx, toIdx) {
    var a = state.board[fromIdx];
    var d = state.board[toIdx];
    if (!a || !d || a.side === d.side) return false;
    if (isTrapOf(toIdx, a.side)) return false;
    return a.rank === d.rank;
  }

  /*
   * Lion and tiger leap across a whole pool, horizontally or vertically.
   * Any rat standing in the water on the path blocks the leap, either colour.
   * Returns the landing index, or -1 if this direction is not a legal leap.
   */
  function leapTarget(state, fromIdx, dc, dr) {
    var p = state.board[fromIdx];
    if (!p || (p.rank !== RANK.lion && p.rank !== RANK.tiger)) return -1;

    var c = colOf(fromIdx) + dc;
    var r = rowOf(fromIdx) + dr;
    var crossed = 0;

    while (inBoard(c, r) && isWater(idx(c, r))) {
      if (state.board[idx(c, r)]) return -1; // a rat in the pool blocks it
      crossed++;
      c += dc;
      r += dr;
    }
    if (crossed === 0) return -1;      // not aimed at water at all
    if (!inBoard(c, r)) return -1;     // pool runs off the board
    return idx(c, r);
  }

  function legalMovesFrom(state, fromIdx) {
    var p = state.board[fromIdx];
    var moves = [];
    if (!p) return moves;

    for (var k = 0; k < DIRS.length; k++) {
      var dc = DIRS[k][0], dr = DIRS[k][1];
      var nc = colOf(fromIdx) + dc, nr = rowOf(fromIdx) + dr;
      if (!inBoard(nc, nr)) continue;
      var to = idx(nc, nr);

      if (isWater(to)) {
        if (p.rank === RANK.rat) {
          // Rat may enter water; capture rules still apply (rat vs rat).
          if (isCroc(to)) continue; // the crocodile is in the way
          if (state.board[to] && !canCapture(state, fromIdx, to)) continue;
          moves.push(to);
        } else {
          var landing = leapTarget(state, fromIdx, dc, dr);
          if (landing < 0) continue;
          var occ = state.board[landing];
          if (occ && (occ.side === p.side || !canCapture(state, fromIdx, landing))) continue;
          moves.push(landing);
        }
        continue;
      }

      if (isDen(to, p.side)) continue; // never enter your own den
      if (state.board[to] && !canCapture(state, fromIdx, to)) continue;
      moves.push(to);
    }
    return moves;
  }

  function legalMoves(state, side) {
    side = side || state.turn;
    var out = [];
    for (var i = 0; i < state.board.length; i++) {
      var p = state.board[i];
      if (!p || p.side !== side) continue;
      legalMovesFrom(state, i).forEach(function (to) {
        out.push({ from: i, to: to });
      });
    }
    return out;
  }

  function hasPieces(state, side) {
    return state.board.some(function (p) { return p && p.side === side; });
  }

  function applyMove(state, fromIdx, toIdx) {
    var p = state.board[fromIdx];
    if (!p) throw new Error('no piece at ' + fromIdx);
    if (p.side !== state.turn) throw new Error('not ' + p.side + "'s turn");
    if (legalMovesFrom(state, fromIdx).indexOf(toIdx) < 0) {
      throw new Error('illegal move ' + fromIdx + '->' + toIdx);
    }

    var captured = state.board[toIdx];
    var mutual = captured ? isMutualKill(state, fromIdx, toIdx) : false;

    state.board[fromIdx] = null;
    state.board[toIdx] = mutual ? null : p;
    state.history.push({
      from: fromIdx, to: toIdx, piece: p, captured: captured, mutual: mutual
    });

    var foe = opponent(p.side);
    var weLive = hasPieces(state, p.side);
    var theyLive = hasPieces(state, foe);

    if (isDen(toIdx, foe) && !mutual) state.winner = p.side;
    else if (!weLive && !theyLive) state.winner = 'draw'; // last two traded off
    else if (!theyLive) state.winner = p.side;
    else if (!weLive) state.winner = foe;
    else {
      state.turn = foe;
      // Stalemate counts as a loss for the side with nothing to play.
      if (legalMoves(state, foe).length === 0) state.winner = p.side;
    }
    return state;
  }

  // Test/level helper: build a position from a sparse list instead of the full layout.
  function makePosition(pieces, turn) {
    var board = new Array(COLS * ROWS).fill(null);
    pieces.forEach(function (e) {
      board[idx(e.c, e.r)] = piece(RANK[e.rank], e.side);
    });
    return { board: board, turn: turn || 'red', winner: null, history: [] };
  }

  return {
    COLS: COLS, ROWS: ROWS, RANK: RANK, NAME_CN: NAME_CN, KEY_BY_RANK: KEY_BY_RANK,
    WATER: WATER, CROC: CROC, TRAP: TRAP, DEN: DEN,
    idx: idx, colOf: colOf, rowOf: rowOf, inBoard: inBoard,
    isWater: isWater, isCroc: isCroc, isDen: isDen, isTrapOf: isTrapOf, opponent: opponent,
    createGame: createGame, makePosition: makePosition,
    canCapture: canCapture, isMutualKill: isMutualKill, leapTarget: leapTarget,
    legalMovesFrom: legalMovesFrom, legalMoves: legalMoves, applyMove: applyMove
  };
});
