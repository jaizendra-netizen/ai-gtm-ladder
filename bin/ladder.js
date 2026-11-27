#!/usr/bin/env node
'use strict';
const path = require('path');
const L = require('../lib');

const HELP = `ai-gtm-ladder: track your climb up the 15-step AI GTM ladder.

  ladder list                 all 15 steps in order, grouped by level
  ladder show N               what step N means and which earlier steps it draws on
  ladder status               checklist, level progress, gaps and the next step
  ladder done N [N...]        mark steps solid (only when you can honestly say so)
  ladder undone N [N...]      mark steps not solid
  ladder next                 the step after your highest solid one
  ladder tools [LEVEL]        established and still-moving tools for a level

Options: --file PATH   state file (default ./.ai-gtm-ladder.json)`;

function main(argv, out = console.log) {
  const args = argv.slice();
  let file = path.resolve('.ai-gtm-ladder.json');
  const fi = args.indexOf('--file');
  if (fi !== -1) {
    if (!args[fi + 1]) throw new Error('--file needs a path');
    file = path.resolve(args[fi + 1]);
    args.splice(fi, 2);
  }
  const cmd = args.shift();
  switch (cmd) {
    case 'list': out(L.renderList()); return 0;
    case 'show': out(L.renderStep(L.parseStep(args[0]))); return 0;
    case 'status': out(L.renderStatus(L.load(file))); return 0;
    case 'done':
    case 'undone': {
      if (!args.length) throw new Error(cmd + ' needs at least one step number');
      let st = L.load(file);
      for (const a of args) st = L.mark(st, L.parseStep(a), cmd === 'done');
      L.save(file, st);
      out(L.renderStatus(st));
      return 0;
    }
    case 'next': {
      const nx = L.next(L.load(file));
      out(nx ? L.renderStep(nx.n) : 'all fifteen steps are marked solid');
      return 0;
    }
    case 'tools': {
      const lv = args[0] ? Number(args[0]) : 0;
      if (args[0] && ![1, 2, 3].includes(lv)) throw new Error('level must be 1, 2 or 3');
      out(L.renderTools(lv));
      return 0;
    }
    case undefined: case 'help': case '--help': out(HELP); return 0;
    default: out(HELP); return 2;
  }
}

if (require.main === module) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error('error: ' + e.message); process.exit(1); }
}
module.exports = { main };
