import { postJson } from './base.js';

// Anthropic keeps `system` as a top-level field (not a message role),
// requires max_tokens, authenticates with x-api-key rather than a bearer
// token, pins a dated API version, and returns a content block array.

export function createAnthropicAdapter({ apiKey, model = 'claude-sonnet-4-20250514' }) {
  return {
    id: 'claude',
    label: `Claude (${model})`,
    strength: 'coding',

    async send({ system, messages }) {
      const body = { model, max_tokens: 1024, messages };
      if (system) body.system = system;

      const json = await postJson('https://api.anthropic.com/v1/messages', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      });

      const text = (json.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      return {
        text,
        usage: {
          in: json.usage?.input_tokens ?? 0,
          out: json.usage?.output_tokens ?? 0,
        },
      };
    },
  };
}
