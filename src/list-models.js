const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
const res = await fetch(url);
const json = await res.json();
if (!res.ok) {
  console.error(res.status, json.error?.message ?? json);
  process.exit(1);
}
for (const m of json.models ?? []) {
  const methods = m.supportedGenerationMethods ?? [];
  if (methods.includes('generateContent')) {
    console.log(m.name, '-', m.displayName);
  }
}
