# Unified AI Workspace

Single CLI for routing a conversation across Claude, Gemini and GPT, with one shared context store so a model switch does not lose the transcript.

This is the project described on the resume. It runs with no API keys (mock adapters) and with any subset of keys you add to `.env`.

## Run

```
cd unified-ai-workspace
copy .env.example .env
npm start
```

Without keys you get mock models and the whole pipeline still works: routing, switches, compaction, save/load.

Free keys, in this order: [Gemini](https://aistudio.google.com/apikey), then [OpenRouter](https://openrouter.ai/keys). Claude and OpenAI need paid credit. Adapters for all four are written; only registered providers are the ones with a key present.

```
> help me write a quicksort
> /use gemini
> integrate x squared
> /context
> /save
> /quit
```

## Layout

```
src/adapters/     one file per provider; all implement send({ system, messages })
src/router.js     keyword classifier + /use override
src/context/      shared store, token estimate, compaction, switch handoff
src/session/      JSON save/load
src/cli.js        the interface
src/demo.js       non-interactive check of every resume claim
```

## Interview, 60 seconds

I got tired of switching tabs between Claude, Gemini and ChatGPT and losing the thread each time. So I built one workspace: a shared transcript, an adapter per provider that normalises their different request formats, and a router that sends coding to Claude, math to Gemini and planning to GPT. When I switch models the incoming one gets a short system note that earlier assistant turns were written by someone else, plus a running summary if the history has been compacted. Token counting is a 4-characters-per-token estimate compared against the real `usage` the API returns, which is how I decide when to summarise.

Honest scope: routing is keyword scoring, not an LLM classifier — paying a model to pick a model is the wrong trade. Summarisation is extractive and lossy. I have not shipped a UI.

## Talking points they will ask

- Why an adapter layer? Claude wants `system` as a top-level field and `x-api-key`; Gemini calls the assistant role `model` and puts the key in the query string; OpenAI puts system in the messages array. One `send({ system, messages })` hides all of that.
- Why not one context per model? Then a switch loses the work. One store, switch only changes the next adapter.
- What do you lose by summarising? Exact wording and anything the summariser judged unimportant, which is why the last N turns stay verbatim.
- Why keywords not an LLM classifier? Cost and latency.
- What if a prompt matches two categories? Tie falls back to `general`.
- Why not tiktoken? Each provider tokenises differently.

`node src/demo.js` walks every claim without a key.
