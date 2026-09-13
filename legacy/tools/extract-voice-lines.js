#!/usr/bin/env node
/*
 * Dump every spoken line as TSV: key <tab> script.
 * Feed this to a TTS service, save each row as audio/<key>.mp3, and the game
 * stops using the browser voice automatically.
 *
 *   node tools/extract-voice-lines.js > voice-lines.tsv
 */
const { LESSONS, VOICE } = require('../lessons.js');

const rows = new Map();
const add = (l) => { if (l && l.key && !rows.has(l.key)) rows.set(l.key, l.text); };

for (const L of LESSONS) {
  for (const step of L.steps) {
    add(step.say);
    add(step.success);
    (step.hints || []).forEach(add);
    Object.values(step.pieceLines || {}).forEach(add);
  }
}
Object.values(VOICE).forEach(add);

console.log('key\tscript');
for (const [k, v] of rows) console.log(`${k}\t${v}`);
console.error(`${rows.size} lines`);
