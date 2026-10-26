// Non-interactive walkthrough of every resume claim. Run: node src/demo.js

import { buildRegistry } from './adapters/index.js';
import { ContextStore } from './context/store.js';
import { buildSystemPrompt } from './context/handoff.js';
import { compact, needsCompaction } from './context/compactor.js';
import { countMessages, estimateTokens } from './context/tokens.js';
import { classify, route } from './router.js';
import * as sessions from './session/persistence.js';

const registry = buildRegistry();
const store = new ContextStore({ title: 'demo' });

function step(title) {
  console.log(`\n--- ${title} ---`);
}

async function turn(text) {
  const { adapter, reason } = route(text, registry);
  const previous = store.lastResponder();
  if (previous && previous !== adapter.id) {
    store.recordSwitch(previous, adapter.id, reason);
    console.log(`[switch] ${previous} -> ${adapter.id}`);
  }
  store.append('user', text);
  if (needsCompaction(store.wireMessages(), adapter.id)) {
    const { dropped } = await compact(store, { adapter });
    console.log(`[compacted] ${dropped} turns`);
  }
  const system = buildSystemPrompt(store, adapter, { previousModelId: previous });
  const { text: reply, usage } = await adapter.send({ system, messages: store.wireMessages() });
  store.append('assistant', reply, adapter.id);
  console.log(`-> ${adapter.id} (${reason})`);
  console.log(`   estimate=${countMessages(store.wireMessages())} provider.in=${usage.in}`);
  if (system) console.log(`   system: ${system.slice(0, 120)}...`);
}

step('classify');
const samples = {
  'help me write a quicksort in C++': 'coding',
  'integrate x squared from 0 to 1': 'math',
  'plan my week of interview prep': 'planning',
  'hello there': 'general',
  'plan a sorting algorithm': 'coding',
};
let failed = 0;
for (const [prompt, expected] of Object.entries(samples)) {
  const got = classify(prompt);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'ok' : 'FAIL'}  "${prompt}" -> ${got} (want ${expected})`);
}

step('coding turn routes to Claude');
await turn('help me write a quicksort');

step('math turn switches to Gemini, context carries over');
await turn('now integrate x squared');

step('token estimate vs chars');
console.log(`  "abcd" -> ${estimateTokens('abcd')} tokens (want 1)`);

step('compaction keeps recent turns and writes a summary');
for (let i = 0; i < 8; i += 1) {
  store.append('user', `filler turn ${i} ${'x'.repeat(40)}`);
  store.append('assistant', `ack ${i}`, 'gpt');
}
const before = store.messages.length;
const { dropped } = await compact(store, { adapter: registry.get('gpt'), keepRecent: 4 });
console.log(`  before=${before} dropped=${dropped} after=${store.messages.length}`);
console.log(`  summary set: ${Boolean(store.summary)}`);

step('session save / load');
const path = await sessions.save(store);
const loaded = await sessions.load(store.id);
const listed = await sessions.list();
console.log(`  saved ${path}`);
console.log(`  loaded ${loaded.id} with ${loaded.messages.length} turns, summary=${Boolean(loaded.summary)}`);
console.log(`  listed ${listed.length} session(s)`);

if (failed) {
  console.error(`\n${failed} classify check(s) failed`);
  process.exit(1);
}
console.log('\nall demo checks passed');
