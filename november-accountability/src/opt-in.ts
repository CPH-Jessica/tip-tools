import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { generateEditKey, hashEditKey, sealSecret } from './crypto.ts';
import { getParticipantByNameKey, insertParticipant, replaceReviewHolds, updatePrivateNotes } from './db.ts';
import type { ReviewHold } from './db.ts';
import { nameKey, parseDisplayName, parseNote } from './validate.ts';

const TOP_LEVEL = new Set(['month', 'sourceurl', 'capturedat', 'participants', 'reviewonly']);
const PERSON_KEYS = new Set([
  'displayname',
  'statedgoals',
  'reportedprogressnote',
  'numericmonthtotal',
  'numericmonthgoal',
]);
const REVIEW_KEYS = new Set(['ambiguousparticipants', 'instruction']);
const HOLD_KEYS = new Set(['displayname', 'note']);
const FORBIDDEN = new Set([
  'comment',
  'comments',
  'message',
  'messages',
  'profile',
  'profileurl',
  'url',
  'urls',
  'link',
  'links',
  'avatar',
  'email',
  'manuscript',
  'html',
  'userid',
  'username',
  'handle',
  'bio',
  'raw',
  'fullname',
  'lastname',
  'firstname',
  'password',
  'token',
  'secret',
]);

export type ParsedPerson = {
  displayName: string;
  statedGoals: string | null;
  progressNote: string | null;
};

export type ParsedOptIn = {
  participants: ParsedPerson[];
  holds: { displayName: string; note: string }[];
  replaceHolds: boolean;
  ignoredNumericValues: number;
  emptyNumericFields: number;
  discarded: string[];
  withheld: string[];
};

export type ImportResult = {
  enrolled: { displayName: string; created: boolean; editKey: string | null }[];
  held: { displayName: string }[];
  withheld: string[];
  ignoredNumericValues: number;
  emptyNumericFields: number;
  discarded: string[];
  statements: string[];
};

function canonical(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

function fail(message: string): { error: string } {
  return { error: message };
}

export function parseOptIn(payload: unknown): ParsedOptIn | { error: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('The file needs to be a JSON object.');
  const root = payload as Record<string, unknown>;
  const discarded: string[] = [];
  for (const key of Object.keys(root)) {
    const name = canonical(key);
    if (TOP_LEVEL.has(name)) continue;
    if (FORBIDDEN.has(name)) return fail(`Refusing to import because the file includes “${key}”. This desk does not keep that.`);
    return fail(`Refusing to import because the file includes “${key}”, which this desk does not use.`);
  }
  if (root.month !== '2026-11') return fail('This desk only accepts a November 2026 file.');
  if (!Array.isArray(root.participants)) return fail('The file needs a participants list.');
  if (root.participants.length > 200) return fail('That list is too long for this desk.');
  if ('source_url' in root || 'sourceUrl' in root) discarded.push('source_url');
  if ('captured_at' in root || 'capturedAt' in root) discarded.push('captured_at');

  let ignoredNumericValues = 0;
  let emptyNumericFields = 0;
  const participants: ParsedPerson[] = [];
  const seen = new Set<string>();

  for (const item of root.participants) {
    const parsed = parsePerson(item);
    if ('error' in parsed) return parsed;
    ignoredNumericValues += parsed.ignoredNumericValues;
    emptyNumericFields += parsed.emptyNumericFields;
    const key = nameKey(parsed.person.displayName);
    if (seen.has(key)) return fail('Two people in the file share a display name. Fix that before importing so each desk stays separate.');
    seen.add(key);
    participants.push(parsed.person);
  }

  let holds: { displayName: string; note: string }[] = [];
  let replaceHolds = false;
  if ('review_only' in root || 'reviewOnly' in root) {
    replaceHolds = true;
    const review = root.review_only ?? root.reviewOnly;
    const parsed = parseReview(review);
    if ('error' in parsed) return parsed;
    if (parsed.discardedInstruction) discarded.push('review_only.instruction');
    holds = parsed.holds;
  }

  const heldKeys = new Set(holds.map((hold) => nameKey(hold.displayName)));
  const enrolled: ParsedPerson[] = [];
  const withheld: string[] = [];
  for (const person of participants) {
    if (heldKeys.has(nameKey(person.displayName))) withheld.push(person.displayName);
    else enrolled.push(person);
  }

  return { participants: enrolled, holds, replaceHolds, ignoredNumericValues, emptyNumericFields, discarded, withheld };
}

function parsePerson(item: unknown): { person: ParsedPerson; ignoredNumericValues: number; emptyNumericFields: number } | { error: string } {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return fail('Each person in the file needs to be an object.');
  const record = item as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const name = canonical(key);
    if (PERSON_KEYS.has(name)) continue;
    if (FORBIDDEN.has(name)) return fail(`Refusing to import because a person includes “${key}”. This desk does not keep that.`);
    return fail(`Refusing to import because a person includes “${key}”, which this desk does not use.`);
  }
  const displayValue = record.display_name ?? record.displayName;
  const displayName = parseDisplayName(displayValue);
  if (typeof displayName !== 'string') return displayName;
  const stated = parseNote(record.stated_goals ?? record.statedGoals ?? null, 'A stated goal');
  if (stated && typeof stated === 'object') return stated;
  const note = parseNote(record.reported_progress_note ?? record.progressNote ?? null, 'A progress note');
  if (note && typeof note === 'object') return note;

  let ignoredNumericValues = 0;
  let emptyNumericFields = 0;
  for (const key of ['numeric_month_total', 'numeric_month_goal', 'numericMonthTotal', 'numericMonthGoal'] as const) {
    if (!(key in record)) continue;
    const value = record[key];
    if (value == null) emptyNumericFields += 1;
    else if (typeof value === 'number' && Number.isFinite(value)) ignoredNumericValues += 1;
    else return fail('A numeric goal or total was not a plain number or empty. Nothing was imported.');
  }

  return {
    person: { displayName, statedGoals: stated, progressNote: note },
    ignoredNumericValues,
    emptyNumericFields,
  };
}

function parseReview(review: unknown): { holds: { displayName: string; note: string }[]; discardedInstruction: boolean } | { error: string } {
  if (!review || typeof review !== 'object' || Array.isArray(review)) return fail('Review names need to be listed as objects.');
  const record = review as Record<string, unknown>;
  let discardedInstruction = false;
  for (const key of Object.keys(record)) {
    const name = canonical(key);
    if (name === 'instruction') {
      discardedInstruction = true;
      continue;
    }
    if (REVIEW_KEYS.has(name)) continue;
    if (FORBIDDEN.has(name)) return fail(`Refusing to import because review data includes “${key}”.`);
    return fail(`Refusing to import because review data includes “${key}”, which this desk does not use.`);
  }
  const list = record.ambiguous_participants ?? record.ambiguousParticipants;
  if (!Array.isArray(list)) return fail('Review data needs an ambiguous_participants list.');
  if (list.length > 50) return fail('That review list is too long for this desk.');
  const holds: { displayName: string; note: string }[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail('Each review name needs to be an object.');
    const row = item as Record<string, unknown>;
    for (const key of Object.keys(row)) {
      const name = canonical(key);
      if (HOLD_KEYS.has(name)) continue;
      if (FORBIDDEN.has(name)) return fail(`Refusing to import because a review name includes “${key}”.`);
      return fail(`Refusing to import because a review name includes “${key}”, which this desk does not use.`);
    }
    const displayName = parseDisplayName(row.display_name ?? row.displayName);
    if (typeof displayName !== 'string') return displayName;
    const note = parseNote(row.note ?? null, 'A review note');
    if (note && typeof note === 'object') return note;
    const key = nameKey(displayName);
    if (seen.has(key)) return fail('Two review names are the same. Fix that before importing.');
    seen.add(key);
    holds.push({ displayName, note: note ?? 'Held for keeper review. Not enrolled.' });
  }
  return { holds, discardedInstruction };
}

export const OPT_IN_POLICY = [
  'Numeric month goals and totals were not applied. Empty numbers were not turned into zeros.',
  'No progress rows were created from the file.',
  'Names held for review were not enrolled.',
  'Web addresses on the file were not stored.',
  'Writers set their own goals after import. Nothing in the file becomes a completed milestone.',
];

export function applyOptIn(
  db: DatabaseSync,
  parsed: ParsedOptIn,
  adminToken: string,
  keysFile: string | null,
  now: Date,
): ImportResult {
  const stamp = now.toISOString();
  const enrolled: ImportResult['enrolled'] = [];
  const createdKeys: { displayName: string; editKey: string }[] = [];
  db.exec('BEGIN');
  try {
    for (const person of parsed.participants) {
      const existing = getParticipantByNameKey(db, nameKey(person.displayName));
      if (!existing) {
        const editKey = generateEditKey();
        const hashed = hashEditKey(editKey);
        insertParticipant(db, {
          id: randomUUID(),
          displayName: person.displayName,
          nameKey: nameKey(person.displayName),
          unit: null,
          customUnitLabel: null,
          goal: null,
          baseline: null,
          startDate: null,
          statedGoals: person.statedGoals,
          progressNote: person.progressNote,
          editKeyHash: hashed.hash,
          editKeySalt: hashed.salt,
          editKeySealed: sealSecret(adminToken, editKey),
          createdAt: stamp,
          updatedAt: stamp,
        });
        enrolled.push({ displayName: person.displayName, created: true, editKey });
        createdKeys.push({ displayName: person.displayName, editKey });
      } else {
        updatePrivateNotes(db, existing.id, person.statedGoals, person.progressNote, stamp);
        enrolled.push({ displayName: existing.displayName, created: false, editKey: null });
      }
    }
    if (parsed.replaceHolds) {
      const holds: ReviewHold[] = parsed.holds.map((hold) => ({
        id: randomUUID(),
        displayName: hold.displayName,
        nameKey: nameKey(hold.displayName),
        note: hold.note,
        createdAt: stamp,
      }));
      replaceReviewHolds(db, holds);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  if (keysFile && createdKeys.length > 0) {
    fs.mkdirSync(path.dirname(keysFile), { recursive: true });
    fs.writeFileSync(keysFile, `${JSON.stringify({ createdAt: stamp, keys: createdKeys }, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(keysFile, 0o600);
  }

  return {
    enrolled,
    held: parsed.holds.map((hold) => ({ displayName: hold.displayName })),
    withheld: parsed.withheld,
    ignoredNumericValues: parsed.ignoredNumericValues,
    emptyNumericFields: parsed.emptyNumericFields,
    discarded: parsed.discarded,
    statements: OPT_IN_POLICY,
  };
}
