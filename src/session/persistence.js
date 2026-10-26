import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ContextStore } from '../context/store.js';

const DIR = path.join(process.cwd(), 'data', 'sessions');

async function ensureDir() {
  await mkdir(DIR, { recursive: true });
}

export async function save(store) {
  await ensureDir();
  const file = path.join(DIR, `${store.id}.json`);
  // Write to a temp file then rename, so an interrupted save cannot leave a
  // half-written session behind.
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(store.toJSON(), null, 2), 'utf8');
  const { rename } = await import('node:fs/promises');
  await rename(tmp, file);
  return file;
}

export async function load(id) {
  const raw = await readFile(path.join(DIR, `${id}.json`), 'utf8');
  return ContextStore.fromJSON(JSON.parse(raw));
}

export async function list() {
  await ensureDir();
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));

  const out = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(DIR, f), 'utf8'));
      out.push({ id: raw.id, title: raw.title, turns: raw.messages?.length ?? 0 });
    } catch {
      // Skip anything unparseable rather than failing the whole listing.
    }
  }
  return out;
}
