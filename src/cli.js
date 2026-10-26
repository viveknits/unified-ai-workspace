import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { buildRegistry } from './adapters/index.js';
import { ContextStore } from './context/store.js';
import { buildSystemPrompt } from './context/handoff.js';
import { compact, needsCompaction } from './context/compactor.js';
import { budgetFor, countMessages } from './context/tokens.js';
import { route } from './router.js';
import * as sessions from './session/persistence.js';

const registry = buildRegistry();
let store = new ContextStore({ title: 'session' });
let pinned = null;

const HELP = `
  <text>          send to the routed model
  /models         list registered models
  /use <id>       pin a model (manual routing); /use auto to unpin
  /context        show the transcript and token estimate
  /compact        summarise older turns now
  /new [title]    start a fresh session
  /save           save this session
  /load <id>      load a session
  /sessions       list saved sessions
  /help  /quit
`;

function banner() {
  const mode = registry.live ? 'live providers' : 'MOCK providers (no API keys found)';
  console.log(`\nUnified AI Workspace - ${mode}`);
  console.log(`models: ${registry.ids().join(', ')}`);
  console.log(`session: ${store.id}   type /help for commands\n`);
}

async function send(text) {
  const { adapter, reason } = route(text, registry, { override: pinned });
  const previousModelId = store.lastResponder();

  if (previousModelId && previousModelId !== adapter.id) {
    store.recordSwitch(previousModelId, adapter.id, reason);
    console.log(`  [switch] ${previousModelId} -> ${adapter.id}`);
  }

  store.append('user', text, null);

  if (needsCompaction(store.wireMessages(), adapter.id)) {
    const { dropped } = await compact(store, { adapter });
    if (dropped) console.log(`  [compacted] ${dropped} older turns summarised`);
  }

  const system = buildSystemPrompt(store, adapter, { previousModelId });

  try {
    const { text: reply, usage } = await adapter.send({
      system,
      messages: store.wireMessages(),
    });
    store.append('assistant', reply, adapter.id);

    console.log(`\n${adapter.label}  (${reason})`);
    console.log(reply);
    const est = countMessages(store.wireMessages());
    console.log(`  [tokens] provider in=${usage.in} out=${usage.out} | my estimate=${est}\n`);
  } catch (err) {
    console.log(`\n  [error] ${adapter.id} failed: ${err.message}\n`);
    // Drop the user turn we optimistically appended so the transcript does
    // not end on an unanswered message.
    store.messages.pop();
  }
}

async function command(line) {
  const [cmd, ...rest] = line.slice(1).split(/\s+/);
  const arg = rest.join(' ').trim();

  switch (cmd) {
    case 'help':
      console.log(HELP);
      return true;

    case 'models':
      for (const a of registry.all()) {
        const mark = a.id === pinned ? ' *pinned' : '';
        console.log(`  ${a.id.padEnd(12)} ${a.strength.padEnd(10)} ${a.label}${mark}`);
      }
      return true;

    case 'use':
      if (arg === 'auto' || arg === '') {
        pinned = null;
        console.log('  routing: automatic');
      } else if (registry.get(arg)) {
        pinned = arg;
        console.log(`  routing: pinned to ${arg}`);
      } else {
        console.log(`  unknown model: ${arg}`);
      }
      return true;

    case 'context': {
      if (store.summary) console.log(`  [summary] ${store.summary}\n`);
      store.messages.forEach((m, i) => {
        const who = m.role === 'user' ? 'you' : (m.modelId ?? 'assistant');
        console.log(`  ${String(i + 1).padStart(2)}. ${who.padEnd(10)} ${m.content.replace(/\s+/g, ' ').slice(0, 90)}`);
      });
      const id = pinned ?? registry.ids()[0];
      console.log(`\n  estimate ${countMessages(store.wireMessages())} / budget ${budgetFor(id)} tokens`);
      console.log(`  switches: ${store.switches.length}\n`);
      return true;
    }

    case 'compact': {
      const adapter = registry.get(pinned) ?? registry.all()[0];
      const { dropped } = await compact(store, { adapter });
      console.log(`  compacted ${dropped} turns`);
      return true;
    }

    case 'new':
      store = new ContextStore({ title: arg || 'session' });
      console.log(`  new session ${store.id}`);
      return true;

    case 'save':
      console.log(`  saved -> ${await sessions.save(store)}`);
      return true;

    case 'load':
      try {
        store = await sessions.load(arg);
        console.log(`  loaded ${store.id} (${store.messages.length} turns)`);
      } catch {
        console.log(`  no such session: ${arg}`);
      }
      return true;

    case 'sessions': {
      const all = await sessions.list();
      if (all.length === 0) console.log('  none saved');
      for (const s of all) console.log(`  ${s.id}  ${String(s.turns).padStart(3)} turns  ${s.title}`);
      return true;
    }

    case 'quit':
    case 'exit':
      return false;

    default:
      console.log(`  unknown command: /${cmd}`);
      return true;
  }
}

const rl = readline.createInterface({ input: stdin, output: stdout });

// question() never settles once stdin reaches EOF, which happens on Ctrl+D
// and whenever input is piped in, so race it against close.
let closed = false;
rl.once('close', () => {
  closed = true;
});

async function nextLine() {
  if (closed) return null;
  return Promise.race([
    rl.question('> '),
    new Promise((resolve) => rl.once('close', () => resolve(null))),
  ]);
}

banner();

for (;;) {
  const line = await nextLine();
  if (line === null) break;

  const trimmed = line.trim();
  if (trimmed === '') continue;

  if (trimmed.startsWith('/')) {
    if (!(await command(trimmed))) break;
  } else {
    await send(trimmed);
  }
}

rl.close();
