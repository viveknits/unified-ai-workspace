import { buildRegistry } from './adapters/index.js';

const registry = buildRegistry();
console.log('registered:', registry.ids().join(', '), '| live:', registry.live);

async function ping(id, prompt) {
  const adapter = registry.get(id);
  if (!adapter) {
    console.log(`${id}: not registered`);
    return;
  }
  if (adapter.mock) {
    console.log(`${id}: mock only (no key)`);
    return;
  }
  try {
    const { text, usage } = await adapter.send({
      system: null,
      messages: [{ role: 'user', content: prompt }],
    });
    console.log(`${id}: ok  usage in=${usage.in} out=${usage.out}`);
    console.log(`  ${text.trim().slice(0, 160)}`);
  } catch (err) {
    console.log(`${id}: FAIL  ${err.message.slice(0, 300)}`);
  }
}

await ping('gemini', 'Reply with exactly: gemini live');
await ping('claude', 'Reply with exactly: claude live');
