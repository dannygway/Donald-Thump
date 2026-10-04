#!/usr/bin/env node
// Generates the recorded voice for Donald Thump with ElevenLabs.
//
//   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node tools/make-voice.mjs
//
// Reads every line from the LINES block in index.html, renders each one to
// voice/<kind>_<nn>.mp3 and writes voice/manifest.json. The app picks the
// manifest up automatically and adds a "Recorded" voice option.
// Files that already exist are skipped. Delete one to re-render it.
// Pass --dry to list the lines and character count without calling the API.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const m = html.match(/\/\*LINES-START\*\/\s*const LINES = ([\s\S]*?);\s*\/\*LINES-END\*\//);
if (!m) { console.error('Could not find the LINES block in index.html'); process.exit(1); }
const LINES = new Function(`return (${m[1]})`)();

const all = Object.entries(LINES).flatMap(([kind, arr]) => arr.map((text, i) => ({ kind, text, file: `${kind}_${String(i + 1).padStart(2, '0')}.mp3` })));
const chars = all.reduce((n, l) => n + l.text.length, 0);
console.log(`${all.length} lines, ${chars} characters.`);
if (dry) { for (const l of all) console.log(`${l.file}  ${l.text}`); process.exit(0); }
if (!KEY || !VOICE) { console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID first.'); process.exit(1); }

const outDir = path.join(root, 'voice');
await fs.mkdir(outDir, { recursive: true });
const manifest = { model: MODEL, generated: new Date().toISOString(), lines: {} };

for (const l of all) {
  (manifest.lines[l.kind] ||= []).push({ text: l.text, file: l.file });
  const fp = path.join(outDir, l.file);
  try { await fs.access(fp); console.log(`skip ${l.file}`); continue; } catch {}
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: l.text,
      model_id: MODEL,
      // Low stability = more theatrical swings. Raise it if takes come out unhinged.
      voice_settings: { stability: 0.3, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true }
    })
  });
  if (!res.ok) { console.error(`Failed on ${l.file}: ${res.status} ${await res.text()}`); process.exit(1); }
  await fs.writeFile(fp, Buffer.from(await res.arrayBuffer()));
  console.log(`made ${l.file}`);
}

await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Wrote voice/manifest.json. Reload the app and pick "Recorded".');
