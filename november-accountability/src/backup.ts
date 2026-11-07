import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { hashEditKey, openSecret, sealSecret } from './crypto.ts';
import {
  clearLedger,
  insertParticipant,
  listAllLogs,
  listParticipants,
  listReviewHolds,
  replaceDay,
  replaceReviewHolds,
} from './db.ts';
import type { ReviewHold } from './db.ts';
import { HttpError } from './errors.ts';
import { nameKey, parseDayWrite, parseDisplayName, parseNote, parsePlan } from './validate.ts';

const RESTORE_PHRASE = 'restore the ledger';
const PERSON_KEYS = new Set([
  'id',
  'displayName',
  'unit',
  'customUnitLabel',
  'goal',
  'baseline',
  'startDate',
  'statedGoals',
  'progressNote',
  'editKey',
  'logs',
]);

export function buildBackup(db: DatabaseSync, adminToken: string, now: Date) {
  const logs = listAllLogs(db);
  return {
    format: 'invisible-pen-backup-v1' as const,
    exportedAt: now.toISOString(),
    month: '2026-11' as const,
    participants: listParticipants(db).map((person) => {
      let editKey: string | null = null;
      try {
        editKey = openSecret(adminToken, person.editKeySealed);
      } catch {
        editKey = null;
      }
      return {
        id: person.id,
        displayName: person.displayName,
        unit: person.unit,
        customUnitLabel: person.customUnitLabel,
        goal: person.goal,
        baseline: person.baseline,
        startDate: person.startDate,
        statedGoals: person.statedGoals,
        progressNote: person.progressNote,
        editKey,
        logs: logs
          .filter((log) => log.participantId === person.id)
          .map((log) => ({ date: log.date, rest: log.rest, value: log.value })),
      };
    }),
    reviewHolds: listReviewHolds(db).map((hold) => ({ displayName: hold.displayName, note: hold.note })),
  };
}

export function restoreBackup(db: DatabaseSync, payload: unknown, adminToken: string, now: Date): void {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'The backup needs to be a JSON object.');
  }
  const root = payload as Record<string, unknown>;
  if (root.confirm !== RESTORE_PHRASE) {
    throw new HttpError(400, 'Restoration did not run. Type “restore the ledger” to confirm. Nothing was changed.');
  }
  const backup = root.backup;
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new HttpError(400, 'The backup needs to be a JSON object.');
  }
  const body = backup as Record<string, unknown>;
  if (body.format !== 'invisible-pen-backup-v1' || body.month !== '2026-11' || !Array.isArray(body.participants)) {
    throw new HttpError(400, 'This desk only restores its own November 2026 backup.');
  }
  if (body.participants.length > 200) throw new HttpError(400, 'That backup is too large.');
  const holds = Array.isArray(body.reviewHolds) ? body.reviewHolds : null;
  if (!holds || holds.length > 50) throw new HttpError(400, 'The backup review list is missing or too large.');

  const stamp = now.toISOString();
  const people = body.participants.map((item) => readPerson(item));
  const review: ReviewHold[] = holds.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, 'A review hold in the backup is not usable.');
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => key !== 'displayName' && key !== 'note')) {
      throw new HttpError(400, 'A review hold includes a field this desk does not keep.');
    }
    const displayName = parseDisplayName(row.displayName);
    if (typeof displayName !== 'string') throw new HttpError(400, displayName.error);
    const note = parseNote(row.note, 'A review note');
    if (!note || typeof note !== 'string') throw new HttpError(400, 'A review hold needs a short note.');
    return { id: randomUUID(), displayName, nameKey: nameKey(displayName), note, createdAt: stamp };
  });

  const keys = new Set(people.map((person) => person.nameKey));
  if (keys.size !== people.length) throw new HttpError(400, 'The backup has two desks with the same display name.');

  db.exec('BEGIN');
  try {
    clearLedger(db);
    for (const person of people) {
      const hashed = hashEditKey(person.editKey);
      insertParticipant(db, {
        id: person.id,
        displayName: person.displayName,
        nameKey: person.nameKey,
        unit: person.plan?.unit ?? null,
        customUnitLabel: person.plan?.customUnitLabel ?? null,
        goal: person.plan?.goal ?? null,
        baseline: person.plan?.baseline ?? null,
        startDate: person.plan?.startDate ?? null,
        statedGoals: person.statedGoals,
        progressNote: person.progressNote,
        editKeyHash: hashed.hash,
        editKeySalt: hashed.salt,
        editKeySealed: sealSecret(adminToken, person.editKey),
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (const log of person.logs) {
        replaceDay(db, { participantId: person.id, date: log.date, rest: log.rest, value: log.value, updatedAt: stamp });
      }
    }
    replaceReviewHolds(db, review);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function readPerson(item: unknown) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new HttpError(400, 'A desk in the backup is not usable.');
  }
  const row = item as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (!PERSON_KEYS.has(key)) throw new HttpError(400, `The backup includes “${key}”, which this desk does not keep.`);
  }
  const displayName = parseDisplayName(row.displayName);
  if (typeof displayName !== 'string') throw new HttpError(400, displayName.error);
  if (typeof row.editKey !== 'string' || row.editKey.length < 8) {
    throw new HttpError(400, 'A desk in the backup is missing its private key. Nothing was restored.');
  }
  const statedGoals = parseNote(row.statedGoals ?? null, 'A stated goal');
  if (statedGoals && typeof statedGoals === 'object') throw new HttpError(400, statedGoals.error);
  const progressNote = parseNote(row.progressNote ?? null, 'A progress note');
  if (progressNote && typeof progressNote === 'object') throw new HttpError(400, progressNote.error);
  const planEmpty = row.unit == null && row.goal == null && row.baseline == null && row.startDate == null;
  let plan = null;
  if (!planEmpty) {
    const parsed = parsePlan({
      unit: row.unit,
      customUnitLabel: row.customUnitLabel ?? null,
      goal: row.goal,
      baseline: row.baseline,
      startDate: row.startDate,
    });
    if ('error' in parsed) throw new HttpError(400, parsed.error);
    plan = parsed;
  } else if (row.customUnitLabel != null && String(row.customUnitLabel).trim() !== '') {
    throw new HttpError(400, 'A custom unit name is only kept when the unit is custom.');
  }
  if (!Array.isArray(row.logs)) throw new HttpError(400, 'A desk in the backup is missing its day list.');
  const logs: { date: string; rest: boolean; value: number | null }[] = [];
  const seen = new Set<string>();
  for (const log of row.logs) {
    if (!log || typeof log !== 'object' || Array.isArray(log)) throw new HttpError(400, 'A day in the backup is not usable.');
    const entry = log as Record<string, unknown>;
    if (Object.keys(entry).some((key) => !['date', 'rest', 'value'].includes(key))) {
      throw new HttpError(400, 'A day in the backup includes a field this desk does not keep.');
    }
    if (typeof entry.date !== 'string') throw new HttpError(400, 'A day in the backup has no date.');
    const parsed = parseDayWrite({ rest: entry.rest === true, value: entry.rest === true ? null : entry.value });
    if ('error' in parsed) throw new HttpError(400, parsed.error);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || entry.date < '2026-11-01' || entry.date > '2026-11-30') {
      throw new HttpError(400, 'A day in the backup is outside November 2026.');
    }
    if (seen.has(entry.date)) throw new HttpError(400, 'A desk lists the same day twice.');
    seen.add(entry.date);
    logs.push({ date: entry.date, rest: parsed.rest, value: parsed.value });
  }
  const id = typeof row.id === 'string' && /^[0-9a-f-]{36}$/i.test(row.id) ? row.id : randomUUID();
  return {
    id,
    displayName,
    nameKey: nameKey(displayName),
    plan,
    statedGoals,
    progressNote,
    editKey: row.editKey,
    logs,
  };
}
