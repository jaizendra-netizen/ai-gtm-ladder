'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('../lib');
const { main } = require('../bin/ladder');

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ladder-')), 'state.json');
const run = (args) => { const lines = []; const code = main(args, (s) => lines.push(s)); return { code, text: lines.join('\n') }; };

test('fifteen steps, five per level, numbered in order', () => {
  assert.strictEqual(L.STEPS.length, 15);
  L.STEPS.forEach((s, i) => assert.strictEqual(s.n, i + 1));
  for (const l of [1, 2, 3]) assert.strictEqual(L.STEPS.filter((s) => s.level === l).length, 5);
});

test('dependencies only point to earlier steps', () => {
  for (const s of L.STEPS) for (const d of s.needs) assert.ok(d < s.n, `step ${s.n} needs ${d}`);
});

test('next starts at step 1 on an empty ladder', () => {
  assert.strictEqual(L.next({ solid: [] }).n, 1);
});

test('next is the step after the highest solid one', () => {
  assert.strictEqual(L.next({ solid: [1, 2, 3, 4] }).n, 5);
  assert.strictEqual(L.next({ solid: [1, 7] }).n, 8);
});

test('next is null when step 15 is solid', () => {
  assert.strictEqual(L.next({ solid: [15] }), null);
});

test('gaps list unsolid steps below the highest solid step', () => {
  assert.deepStrictEqual(L.gaps({ solid: [1, 2, 5] }), [3, 4]);
  assert.deepStrictEqual(L.gaps({ solid: [] }), []);
  assert.deepStrictEqual(L.gaps({ solid: [1, 2, 3] }), []);
});

test('broken dependencies name the missing steps', () => {
  const b = L.brokenDependencies({ solid: [12] });
  assert.deepStrictEqual(b, [{ step: 12, missing: [3, 4, 6, 7] }]);
  assert.deepStrictEqual(L.brokenDependencies({ solid: [1, 3] }), []);
});

test('mark is idempotent and sorted', () => {
  let s = L.mark({ solid: [] }, 3, true);
  s = L.mark(s, 1, true);
  s = L.mark(s, 3, true);
  assert.deepStrictEqual(s.solid, [1, 3]);
  assert.deepStrictEqual(L.mark(s, 3, false).solid, [1]);
});

test('parseStep rejects bad input', () => {
  for (const bad of ['0', '16', 'x', '2.5', undefined, '']) assert.throws(() => L.parseStep(bad), /1 to 15/);
  assert.strictEqual(L.parseStep('15'), 15);
});

test('level progress counts per level', () => {
  const p = L.levelProgress({ solid: [1, 2, 6] });
  assert.deepStrictEqual(p.map((x) => x.solid), [2, 1, 0]);
});

test('state round trips and tolerates junk', () => {
  const f = tmp();
  assert.deepStrictEqual(L.load(f), { solid: [] });
  L.save(f, { solid: [4, 2, 2] });
  assert.deepStrictEqual(L.load(f), { solid: [2, 4] });
  fs.writeFileSync(f, JSON.stringify({ solid: [1, 99, 'a', 3] }));
  assert.deepStrictEqual(L.load(f), { solid: [1, 3] });
  fs.writeFileSync(f, '{not json');
  assert.throws(() => L.load(f), /cannot read/);
});

test('cli done, status and next', () => {
  const f = tmp();
  run(['done', '1', '2', '3', '--file', f]);
  const st = run(['status', '--file', f]).text;
  assert.match(st, /level 1: 3\/5/);
  assert.match(st, /next: step 4, Positioning and messaging/);
  assert.match(run(['next', '--file', f]).text, /Step 4/);
});

test('cli warns about a gap and a broken dependency', () => {
  const f = tmp();
  const t = run(['done', '1', '12', '--file', f]).text;
  assert.match(t, /gaps below your highest step: 2, 3, 4/);
  assert.match(t, /step 12 draws on steps 3, 4, 6, 7/);
});

test('cli undone removes a step', () => {
  const f = tmp();
  run(['done', '1', '2', '--file', f]);
  run(['undone', '2', '--file', f]);
  assert.deepStrictEqual(L.load(f).solid, [1]);
});

test('cli tools separates established from still moving', () => {
  const t = run(['tools', '2']).text;
  assert.match(t, /established: Apollo; Clay; n8n/);
  assert.match(t, /still moving: Deepline/);
  assert.throws(() => run(['tools', '4']), /level must be/);
});

test('cli show and unknown command', () => {
  assert.match(run(['show', '15']).text, /Compounding engine/);
  assert.strictEqual(run(['bogus']).code, 2);
  assert.strictEqual(run([]).code, 0);
});
