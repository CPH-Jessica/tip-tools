import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { call, withDesk } from './test-util.ts';

test('the public desk is an empty local draft until a private import', async () => {
  await withDesk(async (desk) => {
    const health = await desk.fetch(new Request('http://127.0.0.1/api/health'));
    assert.equal(health.status, 200);
    const healthBody = (await health.json()) as { live: boolean; mode: string };
    assert.equal(healthBody.live, false);
    assert.equal(healthBody.mode, 'local-draft');

    const missingHeader = await desk.fetch(new Request('http://127.0.0.1/api/board'));
    assert.equal(missingHeader.status, 400);

    const board = await call(desk, '/api/board');
    const room = board.body as { members: unknown[]; group: { text: string }; live: boolean };
    assert.equal(room.members.length, 0);
    assert.match(room.group.text, /no sample writers/i);
    assert.equal(room.live, false);

    const page = await call(desk, '/');
    assert.equal(page.status, 200);
    assert.match(page.text, /Local draft/);
    assert.match(page.text, /not a published site/);
    assert.match(page.headers.get('content-security-policy') ?? '', /script-src 'self'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');

    const escaped = await call(desk, '/fonts/%2e%2e/%2e%2e/package.json');
    assert.equal(escaped.status, 404);
    assert.equal(escaped.text.includes('hono'), false);
  });
});

test('public files do not embed opt-in text or unsafe html sinks', () => {
  const js = fs.readFileSync('public/app.js', 'utf8');
  assert.equal(js.includes('innerHTML'), false);
  assert.equal(js.includes('insertAdjacentHTML'), false);
  assert.equal(js.includes('document.write'), false);
  assert.equal(js.includes('eval('), false);
  assert.match(fs.readFileSync('public/styles.css', 'utf8'), /prefers-reduced-motion/);

  const seedPath = process.env.SEED_PATH ?? 'uploads/tracker_seed_private_a6a5.json';
  if (!fs.existsSync(seedPath)) return;
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    source_url?: string;
    participants: { display_name: string; stated_goals?: string; reported_progress_note?: string }[];
    review_only?: { ambiguous_participants?: { display_name: string; note?: string }[] };
  };
  const phrases = [
    seed.source_url ?? '',
    ...seed.participants.flatMap((person) => [person.display_name, person.stated_goals ?? '', person.reported_progress_note ?? '']),
    ...(seed.review_only?.ambiguous_participants ?? []).flatMap((person) => [person.display_name, person.note ?? '']),
  ].filter((phrase) => phrase.trim().length >= 3);

  const files = [...walk('public'), ...walk('src'), ...walk('scripts'), 'README.md', 'package.json'].filter((file) =>
    fs.existsSync(file),
  );
  const corpus = files
    .filter((file) => !file.endsWith('.woff2'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  for (const phrase of phrases) assert.equal(corpus.includes(phrase), false, phrase.slice(0, 40));
});

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
