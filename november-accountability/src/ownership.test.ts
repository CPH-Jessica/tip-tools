import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADMIN, call, sampleOptIn, sessionCookie, withDesk } from './test-util.ts';

test('a visitor cannot write someone else’s desk, and totals do not double count', async () => {
  await withDesk(async (desk) => {
    const imported = await call(desk, '/api/admin/import', { method: 'POST', bearer: ADMIN, body: sampleOptIn() });
    assert.equal(imported.status, 200);
    const result = imported.body as {
      enrolled: { displayName: string; editKey: string | null }[];
      held: { displayName: string }[];
      ignoredNumericValues: number;
      statements: string[];
    };
    assert.deepEqual(
      result.enrolled.map((person) => person.displayName),
      ['North Desk', 'South Desk'],
    );
    assert.deepEqual(
      result.held.map((person) => person.displayName),
      ['Held Writer'],
    );
    assert.equal(result.ignoredNumericValues, 2);
    assert.equal(result.statements.some((line) => /not applied/i.test(line)), true);

    const board = await call(desk, '/api/board');
    assert.equal(board.status, 200);
    const room = board.body as {
      live: boolean;
      members: { id: string; displayName: string; goal: number | null; baseline: number | null; monthAdded: number | null; milestones: number[] }[];
      group: { text: string };
    };
    assert.equal(room.live, false);
    assert.deepEqual(
      room.members.map((member) => member.displayName),
      ['North Desk', 'South Desk'],
    );
    for (const member of room.members) {
      assert.equal(member.goal, null);
      assert.equal(member.baseline, null);
      assert.equal(member.monthAdded, null);
      assert.deepEqual(member.milestones, []);
    }
    const boardText = JSON.stringify(room);
    assert.equal(boardText.includes('Held Writer'), false);
    assert.equal(boardText.includes('33000'), false);
    assert.equal(boardText.includes('50000'), false);
    assert.equal(boardText.includes('Historical note'), false);
    assert.equal(boardText.includes('example.invalid'), false);
    assert.equal(boardText.includes('enroll the held names'), false);
    assert.equal(boardText.includes(result.enrolled[0]!.editKey ?? 'missing-key'), false);

    const northId = room.members[0]!.id;
    const southId = room.members[1]!.id;
    const northKey = result.enrolled[0]!.editKey!;
    const southKey = result.enrolled[1]!.editKey!;

    const nameless = await call(desk, '/api/session', { method: 'POST', body: { participantId: northId } });
    assert.equal(nameless.status, 401);
    const wrong = await call(desk, '/api/session', { method: 'POST', body: { participantId: northId, editKey: 'nope-nope-nope' } });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.getSetCookie().some((cookie) => cookie.startsWith('pen_member=')), false);

    const northLogin = await call(desk, '/api/session', { method: 'POST', body: { participantId: northId, editKey: northKey } });
    const southLogin = await call(desk, '/api/session', { method: 'POST', body: { participantId: southId, editKey: southKey } });
    const northCookie = sessionCookie(northLogin.headers, 'pen_member');
    const southCookie = sessionCookie(southLogin.headers, 'pen_member');

    const me = await call(desk, '/api/me', { cookie: northCookie });
    const mine = me.body as { progressNote: string; statedGoals: string };
    assert.match(mine.progressNote, /Historical note/);
    const southMe = await call(desk, '/api/me', { cookie: southCookie });
    assert.equal(JSON.stringify(southMe.body).includes('Historical note'), false);

    const sneaky = await call(desk, '/api/me/plan', {
      method: 'PUT',
      cookie: northCookie,
      body: { unit: 'words', goal: 1000, baseline: 100, startDate: '2026-11-01', statedGoals: 'overwrite' },
    });
    assert.equal(sneaky.status, 400);
    const planned = await call(desk, '/api/me/plan', {
      method: 'PUT',
      cookie: northCookie,
      body: { unit: 'words', goal: 1000, baseline: 100, startDate: '2026-11-01', participantId: southId },
    });
    assert.equal(planned.status, 200);
    await call(desk, '/api/me/plan', {
      method: 'PUT',
      cookie: southCookie,
      body: { unit: 'chapters', goal: 4, baseline: 0, startDate: '2026-11-01' },
    });

    const forged = await call(desk, '/api/me/days/2026-11-06', {
      method: 'PUT',
      cookie: northCookie,
      body: { value: 100, rest: false, participantId: southId },
    });
    assert.equal(forged.status, 200);
    const replaced = await call(desk, '/api/me/days/2026-11-06', {
      method: 'PUT',
      cookie: northCookie,
      body: { value: 40, rest: false },
    });
    const northView = replaced.body as { monthAdded: number; current: number };
    assert.equal(northView.monthAdded, 40);
    assert.equal(northView.current, 140);

    await call(desk, '/api/me/days/2026-11-06', { method: 'PUT', cookie: southCookie, body: { value: 2, rest: false } });
    const future = await call(desk, '/api/me/days/2026-11-08', { method: 'PUT', cookie: northCookie, body: { value: 9, rest: false } });
    assert.equal(future.status, 400);
    const zero = await call(desk, '/api/me/days/2026-11-05', { method: 'PUT', cookie: northCookie, body: { value: 0, rest: false } });
    assert.equal((zero.body as { monthAdded: number }).monthAdded, 40);
    await call(desk, '/api/me/days/2026-11-04', { method: 'PUT', cookie: northCookie, body: { rest: true } });
    const cleared = await call(desk, '/api/me/days/2026-11-05', { method: 'DELETE', cookie: northCookie });
    const afterClear = cleared.body as { days: { date: string; kind: string; value: number | null }[]; monthAdded: number };
    assert.equal(afterClear.monthAdded, 40);
    assert.equal(afterClear.days.find((day) => day.date === '2026-11-05')?.kind, 'unreported');
    assert.equal(afterClear.days.find((day) => day.date === '2026-11-05')?.value, null);
    assert.equal(afterClear.days.find((day) => day.date === '2026-11-04')?.kind, 'rest');

    const after = await call(desk, '/api/board');
    const members = (after.body as { members: { displayName: string; monthAdded: number | null; lines: string[] }[]; group: { units: { key: string; explicitSum: number | null }[]; text: string } }).members;
    assert.equal(members.find((member) => member.displayName === 'North Desk')?.monthAdded, 40);
    assert.equal(members.find((member) => member.displayName === 'South Desk')?.monthAdded, 2);
    const units = (after.body as { group: { units: { key: string; explicitSum: number | null }[] } }).group.units;
    assert.equal(units.find((unit) => unit.key === 'words')?.explicitSum, 40);
    assert.equal(units.find((unit) => unit.key === 'chapters')?.explicitSum, 2);
    assert.equal(JSON.stringify(units).includes('42'), false);

    const backup = await call(desk, '/api/admin/backup', { cookie: northCookie });
    assert.equal(backup.status, 401);
    const adminBackup = await call(desk, '/api/admin/backup', { bearer: ADMIN });
    assert.equal(adminBackup.status, 200);
    assert.equal(JSON.stringify(adminBackup.body).includes(northKey), true);

    const again = await call(desk, '/api/admin/import', { method: 'POST', bearer: ADMIN, body: sampleOptIn() });
    assert.equal(again.status, 200);
    const reread = await call(desk, '/api/me', { cookie: northCookie });
    const kept = reread.body as { goal: number; monthAdded: number; statedGoals: string };
    assert.equal(kept.goal, 1000);
    assert.equal(kept.monthAdded, 40);
    assert.equal(kept.statedGoals, 'Finish a private project.');
  });
});

test('hostile opt-in fields are refused and write nothing', async () => {
  await withDesk(async (desk) => {
    const rejected = await call(desk, '/api/admin/import', {
      method: 'POST',
      bearer: ADMIN,
      body: {
        month: '2026-11',
        participants: [{ display_name: '<script>alert(1)</script>', stated_goals: null, reported_progress_note: null }],
      },
    });
    assert.equal(rejected.status, 400);
    const profile = await call(desk, '/api/admin/import', {
      method: 'POST',
      bearer: ADMIN,
      body: {
        month: '2026-11',
        participants: [{ display_name: 'North Desk', profile_url: 'https://example.invalid/person', stated_goals: null }],
      },
    });
    assert.equal(profile.status, 400);
    const board = await call(desk, '/api/board');
    assert.equal((board.body as { members: unknown[] }).members.length, 0);
  });
});

test('the site code hides the board until it is entered', async () => {
  await withDesk(async (desk) => {
    const hidden = await call(desk, '/api/board');
    assert.equal(hidden.status, 401);
    const health = await call(desk, '/api/health');
    assert.equal((health.body as { locked: boolean; live: boolean }).locked, true);
    assert.equal((health.body as { live: boolean }).live, false);
    const opened = await call(desk, '/api/access', { method: 'POST', body: { code: 'local-code' } });
    assert.equal(opened.status, 200);
    const board = await call(desk, '/api/board', { cookie: sessionCookie(opened.headers, 'pen_gate') });
    assert.equal(board.status, 200);
    assert.equal((board.body as { members: unknown[] }).members.length, 0);
  }, { siteAccessCode: 'local-code' });
});
