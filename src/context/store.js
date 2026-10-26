import { randomUUID } from 'node:crypto';

// One shared transcript for the whole workspace, not one per model. This is
// the reason context survives a model switch: switching changes which adapter
// the next turn is sent to, and nothing else.
export class ContextStore {
  constructor({ id = randomUUID().slice(0, 8), title = 'untitled' } = {}) {
    this.id = id;
    this.title = title;
    this.createdAt = new Date().toISOString();
    this.messages = [];
    this.switches = [];
    this.summary = null;
  }

  append(role, content, modelId) {
    this.messages.push({
      role,
      content,
      modelId: modelId ?? null,
      at: new Date().toISOString(),
    });
  }

  recordSwitch(fromId, toId, reason) {
    this.switches.push({ from: fromId, to: toId, reason, at: new Date().toISOString() });
  }

  // Which model produced the previous assistant turn, or null on the first turn.
  lastResponder() {
    for (let i = this.messages.length - 1; i >= 0; i -= 1) {
      if (this.messages[i].role === 'assistant') return this.messages[i].modelId;
    }
    return null;
  }

  // Strip workspace bookkeeping; adapters only ever see role and content.
  wireMessages() {
    return this.messages.map(({ role, content }) => ({ role, content }));
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      createdAt: this.createdAt,
      summary: this.summary,
      switches: this.switches,
      messages: this.messages,
    };
  }

  static fromJSON(raw) {
    const store = new ContextStore({ id: raw.id, title: raw.title });
    store.createdAt = raw.createdAt ?? store.createdAt;
    store.summary = raw.summary ?? null;
    store.switches = raw.switches ?? [];
    store.messages = raw.messages ?? [];
    return store;
  }
}
