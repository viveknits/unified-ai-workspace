// Resume: "users manually route tasks to different LLMs (Claude for coding,
// Gemini for math, GPT for planning)"
//
// Manual /use always wins. Automatic classification is only a suggestion
// when nothing is pinned - keyword scoring, not an LLM call, because paying
// a model to decide which model to call is the wrong trade.

const CATEGORIES = {
  coding: [
    'code', 'coding', 'debug', 'bug', 'function', 'class', 'algorithm',
    'refactor', 'compile', 'syntax', 'api', 'regex', 'stack', 'pointer',
    'javascript', 'python', 'cpp', 'c++', 'java', 'typescript', 'html',
    'css', 'sql', 'git', 'implement', 'write a program', 'quicksort',
    'sort', 'sorting',
    'leetcode', 'error', 'exception', 'null',
  ],
  math: [
    'math', 'integral', 'derivative', 'differentiate', 'equation', 'algebra',
    'calculus', 'matrix', 'vector', 'probability', 'statistic', 'prove',
    'theorem', 'solve for', 'x^', 'integrate', 'squared', 'factorial',
    'permutation', 'combination', 'logarithm', 'trigonometry',
  ],
  planning: [
    'plan', 'roadmap', 'schedule', 'outline', 'steps to', 'how should i',
    'agenda', 'milestone', 'prioritise', 'prioritize', 'breakdown',
    'strategy', 'week', 'timeline',
  ],
};

export function classify(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  const scores = { coding: 0, math: 0, planning: 0 };

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const kw of keywords) {
      if (text.includes(kw)) scores[category] += kw.includes(' ') ? 2 : 1;
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  const second = ranked[1][1];

  // No signal, or a genuine tie - do not guess.
  if (bestScore === 0 || bestScore === second) return 'general';
  return best;
}

export function route(prompt, registry, { override = null } = {}) {
  if (override) {
    const pinned = registry.get(override);
    if (pinned) return { adapter: pinned, reason: `pinned to ${pinned.id} by /use` };
  }

  const task = classify(prompt);
  const byStrength = registry.byStrength(task);
  if (byStrength) return { adapter: byStrength, reason: `classified as ${task}` };

  const fallback = registry.all()[0];
  return { adapter: fallback, reason: 'no match, using first available model' };
}
