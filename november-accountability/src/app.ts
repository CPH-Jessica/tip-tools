import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { buildBackup, restoreBackup } from './backup.ts';
import { buildBoard, toBoardMember, toPrivateMember } from './board.ts';
import { hashEditKey, keysMatch, openSecret, verifyEditKey } from './crypto.ts';
import {
  createSession,
  deleteDay,
  deleteSession,
  getParticipant,
  getSession,
  listAllLogs,
  listParticipants,
  listReviewHolds,
  openDatabase,
  replaceDay,
  updatePlan,
} from './db.ts';
import type { Participant } from './db.ts';
import { HttpError } from './errors.ts';
import { OPT_IN_POLICY, applyOptIn, parseOptIn } from './opt-in.ts';
import { isTracking, todayISO, zoneLabel } from './progress.ts';
import type { LogRecord } from './progress.ts';
import { parseDayWrite, parsePlan } from './validate.ts';

export type AppOptions = {
  dbPath: string;
  adminToken: string | null;
  siteAccessCode: string | null;
  timezone: string;
  now?: () => Date;
  keysFile?: string | null;
  publicDir?: string;
  cookieSecure?: boolean;
};

export type Desk = {
  fetch: (request: Request) => Promise<Response>;
  close: () => void;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createApp(options: AppOptions): Desk {
  todayISO(options.now?.() ?? new Date(), options.timezone);
  const db = openDatabase(options.dbPath);
  const publicDir = options.publicDir ?? path.resolve('public');
  const now = () => options.now?.() ?? new Date();
  const nowIso = () => now().toISOString();
  const today = () => todayISO(now(), options.timezone);
  const dummy = hashEditKey(randomUUID());
  const failures = new Map<string, { count: number; reset: number }>();
  const app = new Hono();

  function secure(c: Context) {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Frame-Options', 'DENY');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    c.header('Cache-Control', 'no-store');
  }

  function cookieHeader(name: string, value: string, maxAge: number): string {
    const parts = [`${name}=${encodeURIComponent(value)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${maxAge}`];
    if (options.cookieSecure) parts.push('Secure');
    return parts.join('; ');
  }

  function readCookie(c: Context, name: string): string | null {
    const header = c.req.header('cookie');
    if (!header) return null;
    for (const part of header.split(';')) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
    }
    return null;
  }

  function gateOpen(c: Context): boolean {
    if (!options.siteAccessCode) return true;
    const sid = readCookie(c, 'pen_gate');
    const session = sid ? getSession(db, sid, nowIso()) : null;
    return session?.kind === 'gate';
  }

  function requireGate(c: Context) {
    if (!gateOpen(c)) throw new HttpError(401, 'This desk is locked.');
  }

  function requireAdmin(c: Context) {
    if (!options.adminToken) {
      throw new HttpError(503, 'Keeper tools are not configured. Set ADMIN_TOKEN on the server. This draft does not ship a token.');
    }
    const header = c.req.header('authorization') ?? '';
    const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    if (bearer && keysMatch(bearer, options.adminToken)) return;
    const sid = readCookie(c, 'pen_admin');
    const session = sid ? getSession(db, sid, nowIso()) : null;
    if (session?.kind === 'admin') return;
    throw new HttpError(401, 'Keeper tools need the keeper token.');
  }

  function requireMember(c: Context): Participant {
    const sid = readCookie(c, 'pen_member');
    const session = sid ? getSession(db, sid, nowIso()) : null;
    const person = session?.kind === 'member' && session.participantId ? getParticipant(db, session.participantId) : null;
    if (!person) throw new HttpError(401, 'Open your desk with your display name and private key. The name alone saves nothing.');
    return person;
  }

  function logsFor(participantId: string): LogRecord[] {
    return listAllLogs(db)
      .filter((log) => log.participantId === participantId)
      .map((log) => ({ date: log.date, rest: log.rest, value: log.value }));
  }

  function tooMany(id: string): boolean {
    const row = failures.get(id);
    if (!row || row.reset < now().getTime()) return false;
    return row.count >= 8;
  }

  function markFailure(id: string) {
    const row = failures.get(id);
    const clock = now().getTime();
    if (!row || row.reset < clock) failures.set(id, { count: 1, reset: clock + 15 * 60 * 1000 });
    else row.count += 1;
  }

  async function readJson(c: Context): Promise<unknown> {
    const length = Number(c.req.header('content-length') ?? '0');
    if (Number.isFinite(length) && length > 512_000) throw new HttpError(413, 'That file is too large for this desk.');
    const text = await c.req.text();
    if (text.length > 512_000) throw new HttpError(413, 'That file is too large for this desk.');
    if (!text.trim()) throw new HttpError(400, 'The request was empty.');
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HttpError(400, 'That did not parse as JSON.');
    }
  }

  function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'The request needs to be a JSON object.');
    return value as Record<string, unknown>;
  }

  app.use('*', async (c, next) => {
    try {
      await next();
    } finally {
      secure(c);
    }
  });

  app.use('/api/*', async (c, next) => {
    const healthGet = c.req.path === '/api/health' && c.req.method === 'GET';
    if (!healthGet && c.req.header('x-pen-request') !== '1') {
      throw new HttpError(400, 'The desk did not accept that request.');
    }
    if (c.req.path !== '/api/health' && c.req.path !== '/api/access') requireGate(c);
    await next();
  });

  app.onError((err, c) => {
    secure(c);
    if (err instanceof HttpError) return c.json({ error: err.message }, statusCode(err.status));
    console.error('desk error');
    return c.json({ error: 'The ledger could not do that. Nothing was changed.' }, 500);
  });

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      live: false,
      mode: 'local-draft',
      locked: !gateOpen(c),
      adminConfigured: Boolean(options.adminToken),
      siteGate: Boolean(options.siteAccessCode),
      month: '2026-11',
      today: today(),
      timezone: options.timezone,
      timezoneLabel: zoneLabel(options.timezone),
      storage: 'sqlite',
    }),
  );

  app.post('/api/access', async (c) => {
    if (!options.siteAccessCode) throw new HttpError(400, 'This local draft has no site access code.');
    const body = record(await readJson(c));
    if (typeof body.code !== 'string' || !keysMatch(body.code, options.siteAccessCode)) {
      throw new HttpError(401, 'That code does not open this desk.');
    }
    const id = randomUUID();
    createSession(db, { id, kind: 'gate', participantId: null, expiresAt: new Date(now().getTime() + 30 * 86400000).toISOString() });
    c.header('set-cookie', cookieHeader('pen_gate', id, 30 * 86400));
    return c.json({ ok: true });
  });

  app.get('/api/board', (c) => c.json(buildBoard(listParticipants(db), listAllLogs(db), today(), options.timezone)));

  app.get('/api/me', (c) => {
    const person = requireMember(c);
    return c.json(toPrivateMember(person, logsFor(person.id), today()));
  });

  app.post('/api/session', async (c) => {
    const body = record(await readJson(c));
    if (typeof body.participantId !== 'string' || typeof body.editKey !== 'string' || !body.editKey.trim()) {
      throw new HttpError(401, 'The name alone saves nothing. Enter the private key for that desk.');
    }
    if (!UUID.test(body.participantId)) {
      verifyEditKey(body.editKey, dummy.hash, dummy.salt);
      throw new HttpError(401, 'That key does not open this desk.');
    }
    if (tooMany(body.participantId)) throw new HttpError(429, 'Too many tries. Wait a little, then use the key again.');
    const person = getParticipant(db, body.participantId);
    if (!person || !verifyEditKey(body.editKey, person.editKeyHash, person.editKeySalt)) {
      if (!person) verifyEditKey(body.editKey, dummy.hash, dummy.salt);
      markFailure(body.participantId);
      throw new HttpError(401, 'That key does not open this desk.');
    }
    failures.delete(person.id);
    const id = randomUUID();
    createSession(db, { id, kind: 'member', participantId: person.id, expiresAt: new Date(now().getTime() + 30 * 86400000).toISOString() });
    c.header('set-cookie', cookieHeader('pen_member', id, 30 * 86400));
    return c.json({ ok: true, displayName: person.displayName });
  });

  app.post('/api/session/logout', (c) => {
    const sid = readCookie(c, 'pen_member');
    if (sid) deleteSession(db, sid);
    c.header('set-cookie', cookieHeader('pen_member', '', 0));
    return c.json({ ok: true });
  });

  app.put('/api/me/plan', async (c) => {
    const person = requireMember(c);
    const parsed = parsePlan(record(await readJson(c)));
    if ('error' in parsed) throw new HttpError(400, parsed.error);
    updatePlan(db, person.id, { ...parsed, updatedAt: nowIso() });
    const next = getParticipant(db, person.id);
    if (!next) throw new HttpError(500, 'The ledger could not do that. Nothing was changed.');
    return c.json(toPrivateMember(next, logsFor(next.id), today()));
  });

  app.put('/api/me/days/:date', async (c) => {
    const person = requireMember(c);
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2026-11-01' || date > '2026-11-30') {
      throw new HttpError(400, 'Choose a date from November 1 through November 30, 2026.');
    }
    if (date > today()) throw new HttpError(400, 'That day has not arrived. It is not counted yet.');
    if (!isTracking(person)) {
      throw new HttpError(400, 'Set a unit, a baseline, a goal, and a start date before logging a day.');
    }
    if (person.startDate && date < person.startDate) {
      throw new HttpError(400, 'That day is before the start date, so it is not counted. Move the start date if counting began earlier.');
    }
    const parsed = parseDayWrite(record(await readJson(c)));
    if ('error' in parsed) throw new HttpError(400, parsed.error);
    replaceDay(db, { participantId: person.id, date, rest: parsed.rest, value: parsed.value, updatedAt: nowIso() });
    const next = getParticipant(db, person.id);
    if (!next) throw new HttpError(500, 'The ledger could not do that. Nothing was changed.');
    return c.json(toPrivateMember(next, logsFor(next.id), today()));
  });

  app.delete('/api/me/days/:date', (c) => {
    const person = requireMember(c);
    const date = c.req.param('date');
    if (date > today()) throw new HttpError(400, 'That day has not arrived. It is not counted yet.');
    deleteDay(db, person.id, date);
    return c.json(toPrivateMember(person, logsFor(person.id), today()));
  });

  app.post('/api/admin/session', async (c) => {
    if (!options.adminToken) {
      throw new HttpError(503, 'Keeper tools are not configured. Set ADMIN_TOKEN on the server. This draft does not ship a token.');
    }
    const body = record(await readJson(c));
    if (typeof body.token !== 'string' || !keysMatch(body.token, options.adminToken)) {
      throw new HttpError(401, 'That token does not open the keeper drawer.');
    }
    const id = randomUUID();
    createSession(db, { id, kind: 'admin', participantId: null, expiresAt: new Date(now().getTime() + 12 * 3600 * 1000).toISOString() });
    c.header('set-cookie', cookieHeader('pen_admin', id, 12 * 3600));
    return c.json({ ok: true });
  });

  app.post('/api/admin/logout', (c) => {
    const sid = readCookie(c, 'pen_admin');
    if (sid) deleteSession(db, sid);
    c.header('set-cookie', cookieHeader('pen_admin', '', 0));
    return c.json({ ok: true });
  });

  app.post('/api/admin/import', async (c) => {
    requireAdmin(c);
    assertPrivateFile(options.keysFile ?? null, publicDir);
    const parsed = parseOptIn(await readJson(c));
    if ('error' in parsed) throw new HttpError(400, parsed.error);
    const result = applyOptIn(db, parsed, options.adminToken!, options.keysFile ?? null, now());
    return c.json(result);
  });

  app.get('/api/admin/roster', (c) => {
    requireAdmin(c);
    const logs = listAllLogs(db);
    return c.json({
      enrolled: listParticipants(db).map((person) => {
        const ownLogs = logs.filter((log) => log.participantId === person.id);
        const view = toBoardMember(person, ownLogs, today());
        return {
          id: person.id,
          displayName: person.displayName,
          unit: person.unit,
          goal: person.goal,
          baseline: person.baseline,
          startDate: person.startDate,
          logCount: ownLogs.length,
          monthAdded: view.monthAdded,
          statedGoals: person.statedGoals,
          progressNote: person.progressNote,
          editKey: openKey(person.editKeySealed, options.adminToken!),
        };
      }),
      held: listReviewHolds(db).map((hold) => ({ displayName: hold.displayName, note: hold.note })),
      policy: OPT_IN_POLICY,
    });
  });

  app.get('/api/admin/backup', (c) => {
    requireAdmin(c);
    c.header('content-disposition', 'attachment; filename="invisible-pen-november-backup.json"');
    return c.json(buildBackup(db, options.adminToken!, now()));
  });

  app.post('/api/admin/restore', async (c) => {
    requireAdmin(c);
    restoreBackup(db, await readJson(c), options.adminToken!, now());
    return c.json({ ok: true });
  });

  app.all('/api/*', (c) => c.json({ error: 'That is not on this desk.' }, 404));

  app.get('*', (c) => servePublic(c, publicDir));

  return {
    fetch: (request) => Promise.resolve(app.fetch(request)),
    close: () => db.close(),
  };
}

function statusCode(status: number): 400 | 401 | 403 | 404 | 413 | 429 | 500 | 503 {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 413 || status === 429 || status === 503) return status;
  return 500;
}

function openKey(sealed: string, adminToken: string): string | null {
  try {
    return openSecret(adminToken, sealed);
  } catch {
    return null;
  }
}

function assertPrivateFile(keysFile: string | null, publicDir: string) {
  if (!keysFile) return;
  const resolved = path.resolve(keysFile);
  const root = path.resolve(publicDir);
  if (resolved === root || resolved.startsWith(`${root}${path.sep}`)) {
    throw new HttpError(500, 'Private keys are not configured in a safe folder.');
  }
}

const FILE_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

function servePublic(c: Context, root: string) {
  let pathname = decodeURIComponent(new URL(c.req.url).pathname);
  if (pathname.includes('\0') || pathname.includes('\\')) return c.text('That page is not on the desk.', 404);
  if (pathname === '/') pathname = '/index.html';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.some((part) => part === '..' || part.startsWith('.'))) return c.text('That page is not on the desk.', 404);
  const file = path.resolve(root, ...parts);
  const base = path.resolve(root);
  if (file !== base && !file.startsWith(`${base}${path.sep}`)) return c.text('That page is not on the desk.', 404);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return c.text('That page is not on the desk.', 404);
  const type = FILE_TYPES[path.extname(file).toLowerCase()];
  if (!type) return c.text('That page is not on the desk.', 404);
  c.header('content-type', type);
  return c.body(new Uint8Array(fs.readFileSync(file)));
}
