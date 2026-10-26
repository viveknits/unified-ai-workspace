import { createAnthropicAdapter } from './anthropic.js';
import { createGeminiAdapter } from './gemini.js';
import { createMockAdapter } from './mock.js';
import { createOpenAiCompatibleAdapter } from './openai.js';

// Only providers with a key present are registered, so the app degrades to
// the mock set rather than failing at startup.
export function buildRegistry(env = process.env) {
  const adapters = [];

  if (env.ANTHROPIC_API_KEY) {
    adapters.push(createAnthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY }));
  }
  if (env.GEMINI_API_KEY) {
    adapters.push(createGeminiAdapter({ apiKey: env.GEMINI_API_KEY }));
  }
  if (env.OPENAI_API_KEY) {
    adapters.push(
      createOpenAiCompatibleAdapter({
        id: 'gpt',
        label: 'GPT',
        strength: 'planning',
        apiKey: env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      }),
    );
  }
  if (env.OPENROUTER_API_KEY) {
    adapters.push(
      createOpenAiCompatibleAdapter({
        id: 'openrouter',
        label: 'OpenRouter',
        strength: 'general',
        apiKey: env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        baseUrl: 'https://openrouter.ai/api/v1',
      }),
    );
  }

  if (adapters.length === 0) {
    adapters.push(
      createMockAdapter({ id: 'claude', label: 'Claude', strength: 'coding' }),
      createMockAdapter({ id: 'gemini', label: 'Gemini', strength: 'math' }),
      createMockAdapter({ id: 'gpt', label: 'GPT', strength: 'planning' }),
    );
  }

  return {
    live: adapters.some((a) => !a.mock),
    all: () => adapters,
    ids: () => adapters.map((a) => a.id),
    get(id) {
      return adapters.find((a) => a.id === id) ?? null;
    },
    byStrength(strength) {
      return adapters.find((a) => a.strength === strength) ?? null;
    },
  };
}
