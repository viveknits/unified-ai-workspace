// Resume: "automatic truncation and summarization"
//
// Policy:
//   1. keep the most recent N turns verbatim - recency matters most
//   2. send everything older to a model for a short factual summary
//   3. store that on store.summary and splice the old messages out
//   4. if summarisation fails, fall back to plain truncation so the turn
//      still goes through
//
// A sliding window forgets the goal from turn one. A summary keeps it.

import { budgetFor, countMessages } from './tokens.js';

export const KEEP_RECENT = 6;

export function needsCompaction(messages, modelId) {
  return countMessages(messages) > budgetFor(modelId);
}

function buildSummaryPrompt(oldMessages) {
  const transcript = oldMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
  return [
    'Summarise the following conversation in at most 8 factual sentences.',
    'Keep names, decisions, code identifiers and numbers. Drop filler.',
    '',
    transcript,
  ].join('\n');
}

export async function compact(store, { adapter, keepRecent = KEEP_RECENT } = {}) {
  const keep = Math.max(1, keepRecent);
  if (!store.messages || store.messages.length <= keep) {
    return { dropped: 0, summary: store.summary };
  }

  const old = store.messages.slice(0, -keep);
  const recent = store.messages.slice(-keep);

  let summary = store.summary;
  if (adapter?.send) {
    try {
      const { text } = await adapter.send({
        system: 'You write concise factual conversation summaries.',
        messages: [{ role: 'user', content: buildSummaryPrompt(old) }],
      });
      summary = [store.summary, text].filter(Boolean).join('\n');
    } catch {
      // Truncate anyway rather than lose the incoming turn.
    }
  }

  store.summary = summary;
  store.messages = recent;
  return { dropped: old.length, summary };
}
