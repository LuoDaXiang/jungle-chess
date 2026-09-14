/*
 * 差分测试：旧 JS 引擎当 oracle，比对 Rust 引擎。
 *
 * 为什么需要它：Rust 引擎的实现和它的单元测试是同一个人读同一份 JS 写出来的。
 * 一处误读会同时进到实现和测试里，测试照样全绿。差分测试换了一个独立的
 * oracle——跑了很久、有 60 个测试背书的旧 JS 引擎——才能抓住一致的误读。
 *
 * 它的弱点也要说清楚：旧 JS 版是基准，不是真理。两边不一致只说明有人错了，
 * 不能断定是 Rust 错。发现分歧要人去看规则，不能无脑改 Rust 迁就 JS。
 *
 *   node tools/differential.cjs [局面数量] [随机种子]
 *
 * 退出码非零表示发现分歧，并打印可复现的局面。
 */
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const J = require(path.join(__dirname, '..', 'legacy', 'engine.js'));

const COUNT = Number(process.argv[2] || 2000);
const SEED = Number(process.argv[3] || 20260914);

// 固定种子的 PRNG。分歧必须可复现，否则查不下去。
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const RANKS = ['rat', 'cat', 'dog', 'wolf', 'leopard', 'tiger', 'lion', 'elephant'];
const SIDES = ['red', 'black'];

function cellCode(p) {
  return p ? `${p.rank}${p.side === 'red' ? 'R' : 'B'}` : '';
}

function toWire(state, id) {
  return JSON.stringify({
    id,
    cells: state.board.map(cellCode),
    turn: state.turn,
  });
}

function cloneState(state) {
  return {
    board: state.board.map((p) => (p ? { rank: p.rank, side: p.side } : null)),
    turn: state.turn,
    winner: state.winner,
    history: [],
  };
}

function outcomeCode(winner) {
  return winner === null || winner === undefined ? 'ongoing' : winner;
}

function movesLine(state, side) {
  return J.legalMoves(state, side)
    .slice()
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map((m) => `${m.from}>${m.to}`)
    .join(',');
}

/* 必须和 crates/difftool/src/main.rs 的 report() 输出完全一致。 */
function jsReport(state) {
  let out = '';
  out += `R ${movesLine(state, 'red')}\n`;
  out += `B ${movesLine(state, 'black')}\n`;

  const mine = J.legalMoves(state, state.turn)
    .slice()
    .sort((a, b) => a.from - b.from || a.to - b.to);

  for (const m of mine) {
    const trial = cloneState(state);
    try {
      J.applyMove(trial, m.from, m.to);
      const h = trial.history[trial.history.length - 1];
      const cap = h && h.captured ? cellCode(h.captured) : '-';
      const mut = h && h.mutual ? 1 : 0;
      out += `M ${m.from}>${m.to} cap=${cap} mut=${mut} out=${outcomeCode(trial.winner)} turn=${trial.turn}\n`;
    } catch (err) {
      out += `M ${m.from}>${m.to} ERR ${err.message}\n`;
    }
  }
  return out;
}

/* 两类输入：从开局随机走出来的可达局面，和稀疏的人造局面。
   前者贴近真实对局，后者才碰得到陷阱 x 鼠象 x 水陆 x 跳河这些组合。 */
function reachablePosition() {
  const s = J.createGame();
  const plies = Math.floor(rnd() * 40);
  for (let i = 0; i < plies; i++) {
    const moves = J.legalMoves(s, s.turn);
    if (!moves.length || s.winner) break;
    const m = pick(moves);
    J.applyMove(s, m.from, m.to);
  }
  return s;
}

function sparsePosition() {
  const n = 2 + Math.floor(rnd() * 5);
  const used = new Set();
  const pieces = [];
  for (let i = 0; i < n; i++) {
    let cell;
    do { cell = Math.floor(rnd() * J.COLS * J.ROWS); } while (used.has(cell));
    used.add(cell);
    pieces.push({ c: J.colOf(cell), r: J.rowOf(cell), rank: pick(RANKS), side: pick(SIDES) });
  }
  return J.makePosition(pieces, pick(SIDES));
}

function main() {
  const positions = [];
  for (let i = 0; i < COUNT; i++) {
    // 一半可达局面，一半稀疏局面。
    const s = i % 2 === 0 ? reachablePosition() : sparsePosition();
    // 已经分出胜负的局面两边语义不同（Rust 拒绝再走），不比。
    if (s.winner) continue;
    positions.push(s);
  }

  const wire = positions.map((s, i) => toWire(s, `p${i}`)).join('\n') + '\n';

  const bin = path.join(__dirname, '..', 'target', 'release', 'difftool');
  const run = spawnSync(bin, [], { input: wire, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (run.error) {
    console.error(`跑不起来 ${bin}：${run.error.message}`);
    console.error('先构建： cargo build --release -p jungle-difftool');
    process.exit(2);
  }
  if (run.status !== 0) {
    console.error(`difftool 退出码 ${run.status}\n${run.stderr}`);
    process.exit(2);
  }

  const rustBlocks = run.stdout.split('=== ').slice(1);
  if (rustBlocks.length !== positions.length) {
    console.error(`块数对不上：Rust ${rustBlocks.length}，期望 ${positions.length}`);
    process.exit(2);
  }

  let mismatches = 0;
  for (let i = 0; i < positions.length; i++) {
    const rust = rustBlocks[i].split('\n').slice(1).join('\n');
    const js = jsReport(positions[i]);
    if (rust.trimEnd() === js.trimEnd()) continue;

    mismatches++;
    if (mismatches > 3) continue; // 只打印前三个，够定位了
    console.error(`\n=== 分歧 #${mismatches}  局面 p${i} ===`);
    console.error(`可复现：node tools/differential.cjs ${COUNT} ${SEED}`);
    console.error(`局面：${toWire(positions[i], `p${i}`)}`);

    const rl = rust.trimEnd().split('\n');
    const jl = js.trimEnd().split('\n');
    for (let k = 0; k < Math.max(rl.length, jl.length); k++) {
      if (rl[k] !== jl[k]) {
        console.error(`  行 ${k}`);
        console.error(`    JS  : ${jl[k] === undefined ? '(没有这一行)' : jl[k]}`);
        console.error(`    Rust: ${rl[k] === undefined ? '(没有这一行)' : rl[k]}`);
      }
    }
  }

  const plies = positions.reduce((n, s) => n + J.legalMoves(s, s.turn).length, 0);
  if (mismatches) {
    console.error(`\n${positions.length} 个局面里 ${mismatches} 个分歧。种子 ${SEED}。`);
    process.exit(1);
  }
  console.log(
    `差分通过：${positions.length} 个局面，${plies} 步逐一比对，` +
      `JS 与 Rust 完全一致。种子 ${SEED}。`,
  );
}

main();
