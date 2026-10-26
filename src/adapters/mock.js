// Deterministic offline provider. Exists so the whole pipeline - routing,
// context store, compaction, session persistence - is runnable and testable
// without any API key or network call.

export function createMockAdapter({ id, label, strength }) {
  return {
    id,
    label,
    strength,
    mock: true,
    async send({ system, messages }) {
      const last = messages.at(-1)?.content ?? '';
      const turns = messages.length;

      const lines = [
        `[${label} mock] I received ${turns} message(s).`,
        system ? `System note in effect: ${system.slice(0, 120)}` : null,
        `Replying to: "${last.slice(0, 160)}"`,
      ].filter(Boolean);

      const text = lines.join('\n');
      const charsIn = (system ?? '').length + messages.reduce((n, m) => n + m.content.length, 0);

      return { text, usage: { in: Math.ceil(charsIn / 4), out: Math.ceil(text.length / 4) } };
    },
  };
}
