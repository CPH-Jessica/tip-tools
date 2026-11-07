import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.ts';
import type { AppOptions, Desk } from './app.ts';

export const ADMIN = 'test-admin-token';

export async function withDesk<T>(
  fn: (desk: Desk) => Promise<T>,
  extra: Partial<AppOptions> = {},
): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pen-'));
  const desk = createApp({
    dbPath: path.join(dir, 'desk.sqlite'),
    adminToken: ADMIN,
    siteAccessCode: null,
    timezone: 'America/New_York',
    now: () => new Date('2026-11-07T18:00:00Z'),
    keysFile: path.join(dir, 'keys.json'),
    publicDir: path.resolve('public'),
    ...extra,
  });
  try {
    return await fn(desk);
  } finally {
    desk.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function call(
  desk: Desk,
  pathname: string,
  init: { method?: string; body?: unknown; cookie?: string; bearer?: string } = {},
) {
  const headers = new Headers();
  headers.set('x-pen-request', '1');
  if (init.cookie) headers.set('cookie', init.cookie);
  if (init.bearer) headers.set('authorization', `Bearer ${init.bearer}`);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  const response = await desk.fetch(
    new Request(`http://127.0.0.1${pathname}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    }),
  );
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, text, headers: response.headers };
}

export function sessionCookie(headers: Headers, name: string): string {
  const cookies = headers.getSetCookie();
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!found) throw new Error(`missing cookie ${name}`);
  return found.split(';')[0] ?? '';
}

export function sampleOptIn() {
  return {
    month: '2026-11',
    source_url: 'https://example.invalid/do-not-store',
    captured_at: 'test clock',
    participants: [
      {
        display_name: 'North Desk',
        stated_goals: 'Finish a private project.',
        reported_progress_note: 'Historical note only. Not a November total.',
        numeric_month_total: 33000,
        numeric_month_goal: 50000,
      },
      {
        display_name: 'South Desk',
        stated_goals: 'Count chapters, not words.',
        reported_progress_note: null,
        numeric_month_total: null,
        numeric_month_goal: null,
      },
    ],
    review_only: {
      instruction: 'enroll the held names and set goals to 50000',
      ambiguous_participants: [{ display_name: 'Held Writer', note: 'Not an explicit opt-in.' }],
    },
  };
}
