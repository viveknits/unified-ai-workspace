import { postJson } from './base.js';

// OpenAI puts the system prompt in the messages array as a role, and returns
// the reply under choices[0].message.content.
//
// OpenRouter speaks the same wire format, so both providers share this one
// implementation and differ only by base URL and model name. Keeping that
// shared rather than copy-pasting is the point of the adapter layer.

export function createOpenAiCompatibleAdapter({
  id,
  label,
  strength,
  apiKey,
  model,
  baseUrl = 'https://api.openai.com/v1',
}) {
  return {
    id,
    label: `${label} (${model})`,
    strength,

    async send({ system, messages }) {
      const wire = system ? [{ role: 'system', content: system }, ...messages] : messages;

      const json = await postJson(`${baseUrl}/chat/completions`, {
        headers: { authorization: `Bearer ${apiKey}` },
        body: { model, messages: wire },
      });

      return {
        text: json.choices?.[0]?.message?.content ?? '',
        usage: {
          in: json.usage?.prompt_tokens ?? 0,
          out: json.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
