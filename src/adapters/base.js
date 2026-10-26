// The one interface every provider is normalised to.
//
//   id       string   stable key used by the router, e.g. "gemini"
//   label    string   human name shown in the CLI
//   strength string   what this model is routed for, e.g. "coding"
//   send({ system, messages }) -> { text, usage: { in, out } }
//
// `messages` is always [{ role: "user" | "assistant", content: string }]
// in chronological order. `system` is a single string or null. Providers
// disagree about all three of those things, and reconciling that is the
// entire job of an adapter.

export async function postJson(url, { headers = {}, body }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response: ${text.slice(0, 200)}`);
  }
}
