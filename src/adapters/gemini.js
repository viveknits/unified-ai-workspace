import { postJson } from './base.js';

// Gemini differs from the others in three ways that the adapter has to absorb:
//   - the assistant role is called "model", not "assistant"
//   - content is nested as contents[].parts[].text
//   - the system prompt is a separate systemInstruction field
//   - the key goes in a query string, not a header

export function createGeminiAdapter({ apiKey, model = 'gemini-flash-latest' }) {
  return {
    id: 'gemini',
    label: `Gemini (${model})`,
    strength: 'math',

    async send({ system, messages }) {
      const body = {
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const json = await postJson(url, { body });
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

      return {
        text,
        usage: {
          in: json.usageMetadata?.promptTokenCount ?? 0,
          out: json.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    },
  };
}
