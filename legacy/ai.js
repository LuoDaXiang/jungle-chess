/*
 * Jungle Chess AI opponents, three levels.
 *
 * Level 1 is deliberately NOT random: a six-year-old gets nothing out of an
 * opponent that hangs pieces. It plays loosely but refuses to walk into an
 * immediate free capture.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    typeof require === 'function' ? require('./engine.js') : root.Jungle
  );
  else root.JungleAI = factory(root.Jungle);
})(typeof self !== 'undefined' ? self : this, function (J) {
  'use strict';

  // Not the raw rank: the rat is worth far more than rank 1 because it answers
  // the elephant, and the elephant is worth less than rank 8 for the same reason.
  var VALUE = [0, 700, 200, 300, 400, 500, 800, 900, 1000];

  /*
   * Five tiers. Strength climbs on three axes at once, not just depth:
   * search depth, thinking time, and search quality (quiescence + a
   * transposition table). Depth alone stalls out — a plain alpha-beta search
   * that stops in the middle of a capture trade misjudges it (horizon effect),
   * so tier 3 and up settle captures before scoring.
   *
   * Time is capped at 3s: past that a child stops waiting and starts clicking.
   */
  var TIME_BUDGET_MS = { 1: 10, 2: 80, 3: 400, 4: 1200, 5: 3000 };
  var DEPTH = { 1: 0, 2: 2, 3: 4, 4: 6, 5: 8 };
  var QUIET = { 1: 0, 2: 0, 3: 2, 4: 4, 5: 6 };   // quiescence plies
  var USE_TT = { 1: false, 2: false, 3: true, 4: true, 5: true };
  // Null-move pruning: let the opponent move twice; if the position is still
  // winning, the subtree cannot matter and is cut. Only for the top tier, and
  // never in thin endgames where passing would be a real option (zugzwang).
  var NULLMOVE = { 1: false, 2: false, 3: false, 4: false, 5: true };
  var MAX_LEVEL = 5;

  // One character per square keeps the key cheap enough to pay for itself.
  var CODE = '.abcdefghABCDEFGH';
  function positionKey(board, turn) {
    var s = new Array(board.length);
    for (var i = 0; i < board.length; i++) {
      var p = board[i];
      s[i] = p ? CODE[p.side === 'red' ? p.rank : p.rank + 8] : '.';
    }
    return s.join('') + turn;
  }

  function cloneState(s) {
    return {
      board: s.board.slice(),
      turn: s.turn,
      winner: s.winner,
      history: [] // the search never needs the move log
    };
  }

  function denDistance(i, side) {
    var target = J.DEN[J.opponent(side)];
    return Math.abs(J.colOf(i) - J.colOf(target)) + Math.abs(J.rowOf(i) - J.rowOf(target));
  }

  // Score from `side`'s point of view. Positive is good for `side`.
  function evaluate(state, side) {
    if (state.winner === 'draw') return 0;
    if (state.winner === side) return 1e6;
    if (state.winner) return -1e6;

    var board = state.board;
    var score = 0;
    for (var i = 0; i < board.length; i++) {
      var p = board[i];
      if (!p) continue;
      var sign = p.side === side ? 1 : -1;
      score += sign * VALUE[p.rank];
      // Mild pull toward the enemy den; small enough that it never outweighs
      // a real capture, but it does break ties toward progress.
      score += sign * (14 - denDistance(i, p.side)) * 15;
    }
    return score;
  }

  // Still used by hangsPiece and the level-1 picker, which run one ply deep.
  function playOut(state, move) {
    var next = cloneState(state);
    J.applyMove(next, move.from, move.to);
    return next;
  }

  /*
   * Search state. The previous code cloned a 63-slot board at every node,
   * which pinned the real search at about four plies no matter how much time
   * a tier was given — tiers 4 and 5 were merely slower copies of tier 3.
   * This makes and unmakes moves on a single board and keeps piece counts
   * incrementally so terminal tests are O(1).
   */
  function toSearch(state) {
    var red = 0, black = 0;
    for (var i = 0; i < state.board.length; i++) {
      var p = state.board[i];
      if (p) { if (p.side === 'red') red++; else black++; }
    }
    return { board: state.board.slice(), turn: state.turn, red: red, black: black };
  }

  function countOf(st, side) { return side === 'red' ? st.red : st.black; }
  function bump(st, side, n) { if (side === 'red') st.red += n; else st.black += n; }

  function makeMove(st, from, to) {
    var moving = st.board[from];
    var captured = st.board[to];
    // Ask the engine, so this can never drift from the real capture rule.
    var mutual = captured ? J.isMutualKill(st, from, to) : false;
    if (captured) {
      bump(st, captured.side, -1);
      if (mutual) bump(st, moving.side, -1);
    }
    st.board[from] = null;
    st.board[to] = mutual ? null : moving;
    st.turn = J.opponent(moving.side);
    return { from: from, to: to, moving: moving, captured: captured, mutual: mutual };
  }

  function unmakeMove(st, u) {
    st.board[u.from] = u.moving;
    st.board[u.to] = u.captured;
    if (u.captured) {
      bump(st, u.captured.side, 1);
      if (u.mutual) bump(st, u.moving.side, 1);
    }
    st.turn = u.moving.side;
  }

  // Terminal value from the mover's point of view, or null if play continues.
  function terminalScore(st, u) {
    var mover = u.moving.side;
    var foe = J.opponent(mover);
    if (J.isDen(u.to, foe) && !u.mutual) return 1e6;
    var weLive = countOf(st, mover) > 0;
    var theyLive = countOf(st, foe) > 0;
    if (!weLive && !theyLive) return 0;
    if (!theyLive) return 1e6;
    if (!weLive) return -1e6;
    return null;
  }

  var CODE = '.abcdefghABCDEFGH';
  function positionKey(board, turn) {
    var s = new Array(board.length);
    for (var i = 0; i < board.length; i++) {
      var p = board[i];
      s[i] = p ? CODE[p.side === 'red' ? p.rank : p.rank + 8] : '.';
    }
    return s.join('') + turn;
  }

  function scoreMove(st, m, ttMove) {
    if (ttMove && m.from === ttMove.from && m.to === ttMove.to) return 1e7;
    var victim = st.board[m.to];
    if (!victim) return 0;
    // Prefer taking something valuable with something cheap.
    return 1e6 + VALUE[victim.rank] - VALUE[st.board[m.from].rank];
  }

  function orderMoves(st, moves, ttMove) {
    for (var i = 0; i < moves.length; i++) moves[i]._s = scoreMove(st, moves[i], ttMove);
    moves.sort(function (a, b) { return b._s - a._s; });
    return moves;
  }

  function evalSearch(st, side) {
    return evaluate({ board: st.board, winner: null }, side);
  }

  function quiescence(st, side, alpha, beta, deadline, qdepth) {
    var standPat = evalSearch(st, side);
    if (qdepth <= 0) return standPat;
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    if (Date.now() > deadline) return standPat;

    var moves = J.legalMoves(st, st.turn);
    var caps = [];
    for (var i = 0; i < moves.length; i++) if (st.board[moves[i].to]) caps.push(moves[i]);
    if (!caps.length) return standPat;
    orderMoves(st, caps, null);

    for (var k = 0; k < caps.length; k++) {
      var u = makeMove(st, caps[k].from, caps[k].to);
      var term = terminalScore(st, u);
      // terminalScore is already from the mover's point of view, which here is
      // `side`. Do NOT negate it — doing so told the search that reaching the
      // enemy den was the worst possible outcome.
      var v = term !== null ? term
            : -quiescence(st, J.opponent(side), -beta, -alpha, deadline, qdepth - 1);
      unmakeMove(st, u);
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function negamax(st, side, depth, alpha, beta, deadline, cfg) {
    if (Date.now() > deadline) return evalSearch(st, side);
    if (depth === 0) {
      return cfg.quiet > 0
        ? quiescence(st, side, alpha, beta, deadline, cfg.quiet)
        : evalSearch(st, side);
    }

    var key = null, ttMove = null;
    if (cfg.tt) {
      key = positionKey(st.board, st.turn);
      var hit = cfg.tt.get(key);
      if (hit) {
        ttMove = hit.move;
        if (hit.depth >= depth) {
          if (hit.flag === 0) return hit.score;
          if (hit.flag < 0 && hit.score <= alpha) return hit.score;
          if (hit.flag > 0 && hit.score >= beta) return hit.score;
        }
      }
    }

    // isFinite(beta) matters: the root searches with an infinite window, and
    // a null window built from Infinity collapses to an empty one, which cuts
    // almost every subtree and makes the top tier search SHALLOWER, not deeper.
    if (cfg.nullMove && depth >= 3 && isFinite(beta) && countOf(st, st.turn) >= 4) {
      var savedTurn = st.turn;
      st.turn = J.opponent(savedTurn);
      var nullScore = -negamax(st, J.opponent(side), depth - 3,
                               -beta, -beta + 1, deadline, cfg);
      st.turn = savedTurn;
      if (nullScore >= beta) return beta;
    }

    var moves = J.legalMoves(st, st.turn);
    if (moves.length === 0) return -1e6;   // nothing to play: this side loses
    orderMoves(st, moves, ttMove);

    var alpha0 = alpha;
    var best = -Infinity;
    var bestMove = null;

    for (var i = 0; i < moves.length; i++) {
      var u = makeMove(st, moves[i].from, moves[i].to);
      var term = terminalScore(st, u);
      var v = term !== null ? term
            : -negamax(st, J.opponent(side), depth - 1, -beta, -alpha, deadline, cfg);
      unmakeMove(st, u);

      if (v > best) { best = v; bestMove = moves[i]; }
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }

    // Never cache a score that came back because the clock ran out.
    if (cfg.tt && cfg.tt.size < 400000 && Date.now() <= deadline) {
      cfg.tt.set(key, {
        depth: depth, score: best, move: bestMove,
        flag: best <= alpha0 ? -1 : (best >= beta ? 1 : 0)
      });
    }
    return best;
  }

  // Would this move leave the piece able to be taken without compensation?
  // An even-or-better trade is not hanging: what matters is whether the capture
  // this move makes covers the piece it puts at risk.
  function hangsPiece(state, move) {
    var gain = state.board[move.to] ? VALUE[state.board[move.to].rank] : 0;
    var next = playOut(state, move);
    if (next.winner) return false;
    // An equal-rank collision removes our piece too: there is nothing left
    // standing on that square for the opponent to take.
    var moved = next.board[move.to];
    if (!moved) return false;
    var loss = VALUE[moved.rank];
    if (gain >= loss) return false;
    var replies = J.legalMoves(next, next.turn);
    for (var i = 0; i < replies.length; i++) {
      if (replies[i].to === move.to) return true;
    }
    return false;
  }

  function pickLevel1(state, rng) {
    var moves = J.legalMoves(state, state.turn);
    if (moves.length === 0) return null;

    var winning = moves.filter(function (m) { return J.isDen(m.to, J.opponent(state.turn)); });
    if (winning.length) return winning[0];

    var safe = moves.filter(function (m) { return !hangsPiece(state, m); });
    var pool = safe.length ? safe : moves;

    var captures = pool.filter(function (m) { return state.board[m.to]; });
    if (captures.length && rng() < 0.7) {
      return captures[Math.floor(rng() * captures.length)];
    }
    return pool[Math.floor(rng() * pool.length)];
  }

  /*
   * chooseMove(state, level, opts) -> {from, to} or null when the side is stuck.
   * opts.rng lets tests make level 1 deterministic.
   */
  // The sorter tags move objects with an internal score; callers must never
  // see it (a deepStrictEqual against {from,to} would fail, and the UI would
  // be carrying engine internals around).
  function cleanMove(m) { return m ? { from: m.from, to: m.to } : null; }

  function chooseMove(state, level, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    level = Math.max(1, Math.min(MAX_LEVEL, level | 0));
    if (state.winner) return null;
    if (level === 1) return cleanMove(pickLevel1(state, rng));

    var side = state.turn;
    var deadline = Date.now() + (opts.budgetMs || TIME_BUDGET_MS[level]);
    var moves = J.legalMoves(state, side);
    if (moves.length === 0) return null;

    var cfg = {
      quiet: QUIET[level],
      tt: USE_TT[level] ? new Map() : null,
      nullMove: NULLMOVE[level]
    };

    var st = toSearch(state);
    var avoid = opts.avoid && opts.avoid.length ? opts.avoid : null;
    var best = null;

    /*
     * Iterative deepening. Only a depth that finished scanning EVERY root move
     * may replace the answer: a half-scanned depth has compared just the first
     * few moves and can be far worse than the complete result below it.
     */
    // opts.fixedDepth pins the search depth regardless of the clock. Tests use
    // it so a ladder result is reproducible: with only a time budget, machine
    // load changes how deep each tier gets and the same seed can flip a game.
    var maxDepth = opts.fixedDepth || DEPTH[level];
    for (var d = 1; d <= maxDepth; d++) {
      var localBest = null;
      var localScore = -Infinity;
      var searched = 0;
      orderMoves(st, moves, best);

      for (var i = 0; i < moves.length; i++) {
        if (Date.now() > deadline) break;
        var u = makeMove(st, moves[i].from, moves[i].to);
        var term = terminalScore(st, u);
        var v = term !== null ? term
              : -negamax(st, J.opponent(side), d - 1, -Infinity, Infinity, deadline, cfg);
        // Small nudge away from positions we have just been in. Far too small
        // to talk the engine out of a real capture or a win, big enough to
        // break a shuffling loop.
        if (avoid && avoid.indexOf(positionKey(st.board, st.turn)) >= 0) v -= 60;
        unmakeMove(st, u);
        searched++;
        if (v > localScore) { localScore = v; localBest = moves[i]; }
      }

      var complete = searched === moves.length;
      if (complete && localBest) {
        best = localBest;
        // Optional diagnostics: the deepest fully-searched ply. Used to check
        // that a tier actually reaches further than the one below it.
        if (opts.stats) opts.stats.depth = d;
      }
      if (!complete) break;
    }
    return cleanMove(best || moves[0]);
  }

  return {
    VALUE: VALUE, TIME_BUDGET_MS: TIME_BUDGET_MS, DEPTH: DEPTH,
    QUIET: QUIET, USE_TT: USE_TT, NULLMOVE: NULLMOVE, MAX_LEVEL: MAX_LEVEL,
    evaluate: evaluate, chooseMove: chooseMove, hangsPiece: hangsPiece,
    positionKey: positionKey,
    _toSearch: toSearch, _makeMove: makeMove, _unmakeMove: unmakeMove,
    _terminalScore: terminalScore
  };
});
