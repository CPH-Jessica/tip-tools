import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from './app.ts';
import { listen } from './node-http.ts';
import { sampleOptIn } from './test-util.ts';

test('two browser sessions share one ledger and survive a restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pen-http-'));
  const dbPath = path.join(dir, 'desk.sqlite');
  const options = {
    dbPath,
    adminToken: 'test-admin-token',
    siteAccessCode: null,
    timezone: 'America/New_York',
    now: () => new Date('2026-11-07T18:00:00Z'),
    keysFile: path.join(dir, 'keys.json'),
    publicDir: path.resolve('public'),
  };

  const first = await open(options);
  try {
    const imported = await hit(first.base, null, '/api/admin/import', {
      method: 'POST',
      bearer: 'test-admin-token',
      body: sampleOptIn(),
    });
    const enrolled = (imported.body as { enrolled: { displayName: string; editKey: string }[] }).enrolled;
    const board = await hit(first.base, null, '/api/board');
    const members = (board.body as { members: { id: string; displayName: string }[] }).members;
    const north = members.find((member) => member.displayName === 'North Desk')!;
    const south = members.find((member) => member.displayName === 'South Desk')!;
    const northJar = jar();
    const southJar = jar();
    await hit(first.base, northJar, '/api/session', {
      method: 'POST',
      body: { participantId: north.id, editKey: enrolled[0]!.editKey },
    });
    await hit(first.base, southJar, '/api/session', {
      method: 'POST',
      body: { participantId: south.id, editKey: enrolled[1]!.editKey },
    });
    await hit(first.base, northJar, '/api/me/plan', {
      method: 'PUT',
      body: { unit: 'words', goal: 1000, baseline: 0, startDate: '2026-11-01' },
    });
    await hit(first.base, southJar, '/api/me/plan', {
      method: 'PUT',
      body: { unit: 'words', goal: 500, baseline: 0, startDate: '2026-11-01' },
    });
    await Promise.all([
      hit(first.base, northJar, '/api/me/days/2026-11-06', { method: 'PUT', body: { value: 100, rest: false } }),
      hit(first.base, southJar, '/api/me/days/2026-11-06', { method: 'PUT', body: { value: 8, rest: false } }),
    ]);
    const during = await hit(first.base, null, '/api/board');
    const duringMembers = (during.body as { members: { displayName: string; monthAdded: number }[] }).members;
    assert.equal(duringMembers.find((member) => member.displayName === 'North Desk')?.monthAdded, 100);
    assert.equal(duringMembers.find((member) => member.displayName === 'South Desk')?.monthAdded, 8);
  } finally {
    await closed(first);
  }

  const second = await open(options);
  try {
    const board = await hit(second.base, null, '/api/board');
    const members = (board.body as { members: { displayName: string; monthAdded: number | null }[] }).members;
    assert.equal(members.find((member) => member.displayName === 'North Desk')?.monthAdded, 100);
    assert.equal(members.find((member) => member.displayName === 'South Desk')?.monthAdded, 8);

    const roster = await hit(second.base, null, '/api/admin/roster', { bearer: 'test-admin-token' });
    const enrolled = (roster.body as { enrolled: { displayName: string; editKey: string; id: string }[] }).enrolled;
    const northRow = enrolled.find((person) => person.displayName === 'North Desk')!;
    const northJar = jar();
    await hit(second.base, northJar, '/api/session', {
      method: 'POST',
      body: { participantId: northRow.id, editKey: northRow.editKey },
    });
    const edited = await hit(second.base, northJar, '/api/me/days/2026-11-06', { method: 'PUT', body: { value: 25, rest: false } });
    assert.equal((edited.body as { monthAdded: number }).monthAdded, 25);
    const after = await hit(second.base, null, '/api/board');
    const afterMembers = (after.body as { members: { displayName: string; monthAdded: number }[]; group: { units: { explicitSum: number | null }[] } }).members;
    assert.equal(afterMembers.find((member) => member.displayName === 'North Desk')?.monthAdded, 25);
    assert.equal(afterMembers.find((member) => member.displayName === 'South Desk')?.monthAdded, 8);
    const summed = (after.body as { group: { units: { explicitSum: number | null }[] } }).group.units[0]?.explicitSum;
    assert.equal(summed, 33);
  } finally {
    await closed(second);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function jar() {
  const pairs = new Map<string, string>();
  return {
    header() {
      return [...pairs.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
    },
    take(response: Response) {
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0] ?? '';
        const eq = pair.indexOf('=');
        if (eq > 0) pairs.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
    },
  };
}

async function hit(
  base: string,
  cookieJar: ReturnType<typeof jar> | null,
  pathname: string,
  init: { method?: string; body?: unknown; bearer?: string } = {},
) {
  const headers = new Headers();
  headers.set('x-pen-request', '1');
  if (cookieJar?.header()) headers.set('cookie', cookieJar.header());
  if (init.bearer) headers.set('authorization', `Bearer ${init.bearer}`);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  const response = await fetch(`${base}${pathname}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  cookieJar?.take(response);
  return { status: response.status, body: (await response.json()) as unknown };
}

async function open(options: Parameters<typeof createApp>[0]) {
  const desk = createApp(options);
  const server = listen(desk, '127.0.0.1', 0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return { desk, server, base: `http://127.0.0.1:${address.port}` };
}

async function closed(openServer: { desk: { close: () => void }; server: { close: (callback: () => void) => void } }) {
  await new Promise<void>((resolve) => openServer.server.close(() => resolve()));
  openServer.desk.close();
}
