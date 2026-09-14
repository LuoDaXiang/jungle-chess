/*
 * 旧版 JS AI 的基准，作为 Rust 版的对照。
 *
 * 局面必须和 crates/ai/examples/bench.rs 里的完全一致，否则两组数字没法比。
 *
 *   node tools/bench-legacy.cjs
 */
'use strict';

const path = require('node:path');
const J = require(path.join(__dirname, '..', 'legacy', 'engine.js'));
const AI = require(path.join(__dirname, '..', 'legacy', 'ai.js'));

const p = (c, r, rank, side) => ({ c, r, rank, side });

function positions() {
  return [
    ['开局', J.createGame()],
    ['中局', J.makePosition([
      p(0, 6, 'elephant', 'red'), p(2, 6, 'wolf', 'red'), p(6, 6, 'rat', 'red'),
      p(1, 7, 'cat', 'red'), p(0, 8, 'tiger', 'red'), p(6, 8, 'lion', 'red'),
      p(0, 0, 'lion', 'black'), p(6, 0, 'tiger', 'black'), p(1, 1, 'dog', 'black'),
      p(0, 2, 'rat', 'black'), p(4, 2, 'wolf', 'black'), p(6, 2, 'elephant', 'black'),
    ], 'red')],
    ['残局', J.makePosition([
      p(0, 8, 'tiger', 'red'), p(6, 8, 'lion', 'red'),
      p(0, 0, 'lion', 'black'), p(6, 0, 'tiger', 'black'),
    ], 'red')],
  ];
}

function run(state, opts) {
  const stats = {};
  const t0 = process.hrtime.bigint();
  AI.chooseMove(state, 5, Object.assign({ stats }, opts));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { depth: stats.depth || 0, ms: Math.round(ms) };
}

console.log('== 固定 3000ms 预算，第五档（旧版 JS）==');
console.log('局面'.padEnd(8), '层数'.padStart(6), '毫秒'.padStart(9));
for (const [name, s] of positions()) {
  const r = run(s, {});
  console.log(name.padEnd(8), String(r.depth).padStart(6), String(r.ms).padStart(9));
}

console.log('');
console.log('== 固定深度 6，量纯速度（旧版 JS）==');
console.log('局面'.padEnd(8), '毫秒'.padStart(9));
for (const [name, s] of positions()) {
  const r = run(s, { fixedDepth: 6, budgetMs: 600000 });
  console.log(name.padEnd(8), String(r.ms).padStart(9));
}

console.log('');
console.log('== 各档在自己的预算内搜到第几层（旧版 JS）==');
console.log('档位'.padEnd(6), '层数'.padStart(6), '实耗ms'.padStart(9));
{
  const g = J.createGame();
  for (let n = 1; n <= 5; n++) {
    const stats = {};
    const t0 = process.hrtime.bigint();
    AI.chooseMove(g, n, { stats, rng: () => 0.5 });
    const ms = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);
    console.log(String(n).padEnd(6), String(stats.depth || 0).padStart(6), String(ms).padStart(9));
  }
}
