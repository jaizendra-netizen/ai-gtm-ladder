'use strict';
const fs = require('fs');

const LEVELS = {
  1: 'AI-assisted',
  2: 'GTM engineering',
  3: 'Agentic GTM',
};

// Fifteen steps in a fixed order. `needs` lists the earlier steps a step explicitly draws on.
const STEPS = [
  { n: 1, level: 1, name: 'GTM foundations', what: 'ICP, positioning and motion settled before you touch tactics. Every tool above this step amplifies what you feed it.', needs: [] },
  { n: 2, level: 1, name: 'Prompt like an operator', what: 'Use AI for research, copy and first drafts by assigning a task with context, constraints and a format, not by asking for opinions.', needs: [] },
  { n: 3, level: 1, name: 'Sharpen your ICP', what: 'A real ICP built with AI from closed-won and closed-lost accounts, not a wishlist dressed up as one.', needs: [] },
  { n: 4, level: 1, name: 'Positioning and messaging', what: 'Turn features into buyer language. Your product does things; your buyer has problems.', needs: [] },
  { n: 5, level: 1, name: 'Content leverage', what: 'Ship posts, briefs and pages at speed without losing the voice.', needs: [] },
  { n: 6, level: 2, name: 'Signals over lists', what: 'Learn the difference between a buying signal and intent data. A list tells you who exists; a signal tells you something changed.', needs: [] },
  { n: 7, level: 2, name: 'Data and enrichment', what: 'Fill in what you do not know about an account or contact, in code rather than by hand. Waterfall enrichment queries providers in sequence until one returns a usable answer.', needs: [] },
  { n: 8, level: 2, name: 'Signal pipelines', what: 'Wire triggers into a live buying feed so a change in the market arrives as a task rather than a report. The first step where something runs without you.', needs: [] },
  { n: 9, level: 2, name: 'Timing and relevance', what: 'Reach the buyers who are in-market now. Outbound works the roughly 5% in market this quarter; content works the 95% who will pick a brand they already recognise.', needs: [5] },
  { n: 10, level: 2, name: 'Outbound systems', what: 'Personalise at scale and end spray-and-pray: enough signal that the message writes itself.', needs: [6, 7, 8, 9] },
  { n: 11, level: 3, name: 'Operator setup', what: 'An agent with three things: context about your business, memory that survives between runs, and tools it is allowed to use. Start with one operator and one narrow job.', needs: [] },
  { n: 12, level: 3, name: 'Research to outreach', what: 'Hand off a multi-step operation end to end, from finding an account to the first message. Run it in draft mode longer than feels necessary.', needs: [3, 4, 6, 7] },
  { n: 13, level: 3, name: 'Orchestration', what: 'Chain operators across the funnel so one output becomes the next input, and decide where a human sits in the chain.', needs: [] },
  { n: 14, level: 3, name: 'Measurement loops', what: 'Close the loop on what actually converts and feed it back: what was sent, what converted, and what the operator should do differently.', needs: [] },
  { n: 15, level: 3, name: 'Compounding engine', what: 'A GTM system that runs while you sleep and improves while it runs. The residue of the fourteen steps underneath it, not a tool you can buy.', needs: [14] },
];

// Tool notes per level. "established" is stable enough to build a process around; "moving" is worth using and worth watching.
const TOOLS = {
  1: { established: ['Claude', 'ChatGPT', 'Perplexity'], moving: ['Exa (a search API built for AI applications, not a chat product)'] },
  2: { established: ['Apollo', 'Clay', 'n8n'], moving: ['Deepline (unified API and CLI for GTM data, built for agent use)', 'Railway (a deployment platform, the infrastructure your enrichment code runs on)'] },
  3: { established: ['Cowork', 'Projects (both Anthropic product surfaces)', 'MCP (an open protocol for connecting models to tools and data, not a product you buy)'], moving: ['Relevance AI'] },
};

function emptyState() { return { solid: [] }; }

function load(file) {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    const solid = Array.isArray(s.solid) ? s.solid.filter((n) => Number.isInteger(n) && n >= 1 && n <= 15) : [];
    return { solid: [...new Set(solid)].sort((a, b) => a - b) };
  } catch (e) {
    if (e.code === 'ENOENT') return emptyState();
    throw new Error('cannot read ' + file + ': ' + e.message);
  }
}

function save(file, state) {
  fs.writeFileSync(file, JSON.stringify({ solid: [...new Set(state.solid)].sort((a, b) => a - b) }, null, 2) + '\n');
}

function parseStep(s) {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > 15) throw new Error('step must be a whole number from 1 to 15, got ' + JSON.stringify(s));
  return n;
}

function mark(state, n, solid) {
  const set = new Set(state.solid);
  if (solid) set.add(n); else set.delete(n);
  return { solid: [...set].sort((a, b) => a - b) };
}

/** Steps below the highest solid step that are not solid: the ladder is a dependency chain, not a difficulty ranking. */
function gaps(state) {
  if (!state.solid.length) return [];
  const top = Math.max(...state.solid);
  const out = [];
  for (let n = 1; n < top; n++) if (!state.solid.includes(n)) out.push(n);
  return out;
}

/** Explicit dependencies of solid steps that are not solid themselves. */
function brokenDependencies(state) {
  const out = [];
  for (const n of state.solid) {
    const missing = STEPS[n - 1].needs.filter((d) => !state.solid.includes(d));
    if (missing.length) out.push({ step: n, missing });
  }
  return out;
}

/** Find the highest step you can honestly call solid, then start at the one after it. */
function next(state) {
  if (!state.solid.length) return STEPS[0];
  const top = Math.max(...state.solid);
  return top >= 15 ? null : STEPS[top];
}

function levelProgress(state) {
  return [1, 2, 3].map((l) => {
    const steps = STEPS.filter((s) => s.level === l);
    return { level: l, name: LEVELS[l], solid: steps.filter((s) => state.solid.includes(s.n)).length, total: steps.length };
  });
}

function renderList() {
  const lines = [];
  let level = 0;
  for (const s of STEPS) {
    if (s.level !== level) { level = s.level; lines.push(`\nLevel ${level}: ${LEVELS[level]}`); }
    lines.push(`  ${String(s.n).padStart(2)}. ${s.name}`);
  }
  return lines.join('\n').trimStart();
}

function renderStep(n) {
  const s = STEPS[n - 1];
  const need = s.needs.length ? '\nDraws on steps: ' + s.needs.join(', ') : '';
  return `Step ${s.n}: ${s.name} (level ${s.level}, ${LEVELS[s.level]})\n${s.what}${need}`;
}

function renderStatus(state) {
  const lines = [];
  let level = 0;
  for (const s of STEPS) {
    if (s.level !== level) { level = s.level; lines.push(`Level ${level}: ${LEVELS[level]}`); }
    lines.push(`  [${state.solid.includes(s.n) ? 'x' : ' '}] ${String(s.n).padStart(2)}. ${s.name}`);
  }
  lines.push('');
  lines.push(levelProgress(state).map((p) => `level ${p.level}: ${p.solid}/${p.total}`).join(', '));
  const g = gaps(state);
  if (g.length) lines.push(`gaps below your highest step: ${g.join(', ')}. The ladder is a dependency chain, so go back to the lowest gap.`);
  for (const b of brokenDependencies(state)) lines.push(`step ${b.step} draws on steps ${b.missing.join(', ')}, which are not solid yet`);
  const nx = next(state);
  lines.push(nx ? `next: step ${nx.n}, ${nx.name}` : 'all fifteen steps are marked solid');
  return lines.join('\n');
}

function renderTools(level) {
  const levels = level ? [level] : [1, 2, 3];
  return levels.map((l) => {
    const t = TOOLS[l];
    return `Level ${l}: ${LEVELS[l]}\n  established: ${t.established.join('; ')}\n  still moving: ${t.moving.join('; ')}`;
  }).join('\n\n');
}

module.exports = { STEPS, LEVELS, TOOLS, load, save, parseStep, mark, gaps, brokenDependencies, next, levelProgress, renderList, renderStep, renderStatus, renderTools };
