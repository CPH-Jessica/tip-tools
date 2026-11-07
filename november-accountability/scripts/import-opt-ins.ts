import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../src/env.ts';
import { openDatabase } from '../src/db.ts';
import { applyOptIn, parseOptIn } from '../src/opt-in.ts';

loadEnv();

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run import -- data/private/opt-ins.json');
  process.exit(1);
}

const resolved = path.resolve(file);
const publicDir = path.resolve('public');
if (resolved === publicDir || resolved.startsWith(`${publicDir}${path.sep}`)) {
  console.error('Refusing to read an opt-in file from the public folder.');
  process.exit(1);
}
if (!fs.existsSync(resolved)) {
  console.error('That opt-in file was not found.');
  process.exit(1);
}
if (!process.env.ADMIN_TOKEN?.trim()) {
  console.error('Set ADMIN_TOKEN before importing. No token is shipped with this draft.');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(resolved, 'utf8')) as unknown;
const parsed = parseOptIn(payload);
if ('error' in parsed) {
  console.error(parsed.error);
  process.exit(1);
}

const db = openDatabase(process.env.DB_PATH ?? 'data/tracker.sqlite');
try {
  const result = applyOptIn(
    db,
    parsed,
    process.env.ADMIN_TOKEN,
    process.env.KEYS_FILE ?? 'data/private/last-import-keys.json',
    new Date(),
  );
  console.log(`Enrolled ${result.enrolled.length}. Held for review ${result.held.length}. Withheld from enrollment ${result.withheld.length}.`);
  console.log(`Numeric values ignored: ${result.ignoredNumericValues}. Empty numeric fields left unset: ${result.emptyNumericFields}.`);
  console.log('Enrolled display names:');
  for (const person of result.enrolled) {
    console.log(`- ${person.displayName}${person.created ? '' : ' (already on the desk)'}`);
  }
  if (result.held.length > 0) {
    console.log('Held, not enrolled:');
    for (const person of result.held) console.log(`- ${person.displayName}`);
  }
  for (const line of result.statements) console.log(line);
  if (result.discarded.length > 0) console.log(`Not stored: ${result.discarded.join(', ')}.`);
  if (result.enrolled.some((person) => person.created)) {
    console.log('New private keys were written to the keys file. They are not on the community board.');
  }
} finally {
  db.close();
}
