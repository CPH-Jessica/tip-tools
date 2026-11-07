import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Unit } from './validate.ts';

export type Participant = {
  id: string;
  displayName: string;
  nameKey: string;
  unit: Unit | null;
  customUnitLabel: string | null;
  goal: number | null;
  baseline: number | null;
  startDate: string | null;
  statedGoals: string | null;
  progressNote: string | null;
  editKeyHash: string;
  editKeySalt: string;
  editKeySealed: string;
  createdAt: string;
  updatedAt: string;
};

export type DayLog = {
  participantId: string;
  date: string;
  rest: boolean;
  value: number | null;
  updatedAt: string;
};

export type ReviewHold = {
  id: string;
  displayName: string;
  nameKey: string;
  note: string;
  createdAt: string;
};

export type SessionRow = {
  id: string;
  kind: 'member' | 'admin' | 'gate';
  participantId: string | null;
  expiresAt: string;
};

type ParticipantRow = {
  id: string;
  display_name: string;
  name_key: string;
  unit: string | null;
  custom_unit_label: string | null;
  goal: number | null;
  baseline: number | null;
  start_date: string | null;
  stated_goals: string | null;
  progress_note: string | null;
  edit_key_hash: string;
  edit_key_salt: string;
  edit_key_sealed: string;
  created_at: string;
  updated_at: string;
};

function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    displayName: row.display_name,
    nameKey: row.name_key,
    unit: row.unit as Unit | null,
    customUnitLabel: row.custom_unit_label,
    goal: row.goal,
    baseline: row.baseline,
    startDate: row.start_date,
    statedGoals: row.stated_goals,
    progressNote: row.progress_note,
    editKeyHash: row.edit_key_hash,
    editKeySalt: row.edit_key_salt,
    editKeySealed: row.edit_key_sealed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function openDatabase(file: string): DatabaseSync {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      unit TEXT,
      custom_unit_label TEXT,
      goal REAL,
      baseline REAL,
      start_date TEXT,
      stated_goals TEXT,
      progress_note TEXT,
      edit_key_hash TEXT NOT NULL,
      edit_key_salt TEXT NOT NULL,
      edit_key_sealed TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS day_logs (
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      rest INTEGER NOT NULL CHECK (rest IN (0, 1)),
      value REAL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (participant_id, date),
      CHECK ((rest = 1 AND value IS NULL) OR (rest = 0 AND value IS NOT NULL))
    );
    CREATE TABLE IF NOT EXISTS review_holds (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      participant_id TEXT,
      expires_at TEXT NOT NULL
    );
  `);
  return db;
}

export function listParticipants(db: DatabaseSync): Participant[] {
  const rows = db.prepare('SELECT * FROM participants').all() as ParticipantRow[];
  return rows.map(mapParticipant).sort((a, b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }));
}

export function getParticipant(db: DatabaseSync, id: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
  return row ? mapParticipant(row) : null;
}

export function getParticipantByNameKey(db: DatabaseSync, key: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE name_key = ?').get(key) as ParticipantRow | undefined;
  return row ? mapParticipant(row) : null;
}

export function insertParticipant(db: DatabaseSync, person: Participant): void {
  db.prepare(`
    INSERT INTO participants (
      id, display_name, name_key, unit, custom_unit_label, goal, baseline, start_date,
      stated_goals, progress_note, edit_key_hash, edit_key_salt, edit_key_sealed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    person.id,
    person.displayName,
    person.nameKey,
    person.unit,
    person.customUnitLabel,
    person.goal,
    person.baseline,
    person.startDate,
    person.statedGoals,
    person.progressNote,
    person.editKeyHash,
    person.editKeySalt,
    person.editKeySealed,
    person.createdAt,
    person.updatedAt,
  );
}

export function updatePrivateNotes(
  db: DatabaseSync,
  id: string,
  statedGoals: string | null,
  progressNote: string | null,
  updatedAt: string,
): void {
  db.prepare('UPDATE participants SET stated_goals = ?, progress_note = ?, updated_at = ? WHERE id = ?').run(
    statedGoals,
    progressNote,
    updatedAt,
    id,
  );
}

export function updatePlan(
  db: DatabaseSync,
  id: string,
  plan: { unit: Unit; customUnitLabel: string | null; goal: number; baseline: number; startDate: string; updatedAt: string },
): void {
  db.prepare(`
    UPDATE participants
    SET unit = ?, custom_unit_label = ?, goal = ?, baseline = ?, start_date = ?, updated_at = ?
    WHERE id = ?
  `).run(plan.unit, plan.customUnitLabel, plan.goal, plan.baseline, plan.startDate, plan.updatedAt, id);
}

export function listAllLogs(db: DatabaseSync): DayLog[] {
  const rows = db.prepare('SELECT participant_id, date, rest, value, updated_at FROM day_logs').all() as {
    participant_id: string;
    date: string;
    rest: number;
    value: number | null;
    updated_at: string;
  }[];
  return rows.map((row) => ({
    participantId: row.participant_id,
    date: row.date,
    rest: row.rest === 1,
    value: row.value,
    updatedAt: row.updated_at,
  }));
}

export function replaceDay(
  db: DatabaseSync,
  entry: { participantId: string; date: string; rest: boolean; value: number | null; updatedAt: string },
): void {
  db.prepare(`
    INSERT INTO day_logs (participant_id, date, rest, value, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(participant_id, date) DO UPDATE SET
      rest = excluded.rest,
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(entry.participantId, entry.date, entry.rest ? 1 : 0, entry.value, entry.updatedAt);
}

export function deleteDay(db: DatabaseSync, participantId: string, date: string): void {
  db.prepare('DELETE FROM day_logs WHERE participant_id = ? AND date = ?').run(participantId, date);
}

export function listReviewHolds(db: DatabaseSync): ReviewHold[] {
  const rows = db.prepare('SELECT id, display_name, name_key, note, created_at FROM review_holds').all() as {
    id: string;
    display_name: string;
    name_key: string;
    note: string;
    created_at: string;
  }[];
  return rows
    .map((row) => ({
      id: row.id,
      displayName: row.display_name,
      nameKey: row.name_key,
      note: row.note,
      createdAt: row.created_at,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }));
}

export function replaceReviewHolds(db: DatabaseSync, holds: ReviewHold[]): void {
  db.prepare('DELETE FROM review_holds').run();
  const insert = db.prepare('INSERT INTO review_holds (id, display_name, name_key, note, created_at) VALUES (?, ?, ?, ?, ?)');
  for (const hold of holds) insert.run(hold.id, hold.displayName, hold.nameKey, hold.note, hold.createdAt);
}

export function createSession(db: DatabaseSync, session: SessionRow): void {
  db.prepare('INSERT INTO sessions (id, kind, participant_id, expires_at) VALUES (?, ?, ?, ?)').run(
    session.id,
    session.kind,
    session.participantId,
    session.expiresAt,
  );
}

export function getSession(db: DatabaseSync, id: string, nowIso: string): SessionRow | null {
  const row = db.prepare('SELECT id, kind, participant_id, expires_at FROM sessions WHERE id = ?').get(id) as
    | { id: string; kind: SessionRow['kind']; participant_id: string | null; expires_at: string }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= nowIso) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  return { id: row.id, kind: row.kind, participantId: row.participant_id, expiresAt: row.expires_at };
}

export function deleteSession(db: DatabaseSync, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteAllSessions(db: DatabaseSync): void {
  db.prepare('DELETE FROM sessions').run();
}

export function clearLedger(db: DatabaseSync): void {
  db.exec('DELETE FROM day_logs; DELETE FROM participants; DELETE FROM review_holds; DELETE FROM sessions;');
}
