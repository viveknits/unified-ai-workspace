// Resume: "token-aware context management ... to keep sessions within each
// model's context window limits"
//
// ~4 characters per token is the English heuristic. It undercounts code and
// non-Latin text. Adapters return real usage.in; compare the two on a few
// turns so you can say how wrong you are in the interview.
//
// Why not tiktoken? Each provider tokenises differently, so you would need
// one tokenizer per adapter. The heuristic is one function and good enough
// to decide when to compact.

export const PER_MESSAGE_OVERHEAD = 4;
export const CHARS_PER_TOKEN = 4;

// Usable prompt budget = advertised window minus reply headroom.
// If the prompt fills the whole window there is no room to answer.
export const WINDOWS = {
  claude: 8000,
  gemini: 8000,
  gpt: 8000,
  openrouter: 8000,
};

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / CHARS_PER_TOKEN);
}

export function countMessages(messages) {
  let total = 0;
  for (const m of messages ?? []) {
    total += estimateTokens(m.content) + PER_MESSAGE_OVERHEAD;
  }
  return total;
}

export function budgetFor(modelId) {
  return WINDOWS[modelId] ?? 8000;
}
