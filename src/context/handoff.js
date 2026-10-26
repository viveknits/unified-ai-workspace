// Resume: "a persistent, shared context store so conversation state carries
// over automatically when the user switches from one model to another"
//
// The transcript already carries over. The incoming model still sees
// assistant turns it did not write, so on a switch we prepend a short
// system note. Empty system prompts are worse than none.

export function buildSystemPrompt(store, adapter, { previousModelId = null } = {}) {
  const parts = [];

  if (previousModelId && adapter && previousModelId !== adapter.id) {
    parts.push(
      `Earlier assistant turns in this transcript were written by ${previousModelId}, ` +
        `not by you (${adapter.id}). Continue from that shared context.`,
    );
  }

  if (store?.summary) {
    parts.push(`Summary of earlier conversation: ${store.summary}`);
  }

  return parts.length ? parts.join('\n\n') : null;
}
