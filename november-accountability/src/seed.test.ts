import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { ADMIN, call, sessionCookie, withDesk } from './test-util.ts';

const seedPath = process.env.SEED_PATH ?? 'uploads/tracker_seed_private_a6a5.json';

test('the private seed enrolls only its participants and keeps numbers off the board', async (t) => {
  if (!fs.existsSync(seedPath)) {
    t.skip('private seed file is not on this machine');
    return;
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    source_url?: string;
    participants: { display_name: string; stated_goals: string | null; reported_progress_note: string | null; numeric_month_goal: number | null; numeric_month_total: number | null }[];
    review_only: { ambiguous_participants: { display_name: string; note: string }[]; instruction?: string };
  };

  await withDesk(async (desk) => {
    const imported = await call(desk, '/api/admin/import', { method: 'POST', bearer: ADMIN, body: seed });
    assert.equal(imported.status, 200);
    const result = imported.body as {
      enrolled: { displayName: string; editKey: string | null; created: boolean }[];
      held: { displayName: string }[];
      ignoredNumericValues: number;
      emptyNumericFields: number;
    };
    assert.deepEqual(
      result.enrolled.map((person) => person.displayName).sort(),
      seed.participants.map((person) => person.display_name).sort(),
    );
    assert.deepEqual(
      result.held.map((person) => person.displayName).sort(),
      seed.review_only.ambiguous_participants.map((person) => person.display_name).sort(),
    );
    assert.equal(result.ignoredNumericValues, 0);
    assert.ok(result.emptyNumericFields >= seed.participants.length);

    const boardResponse = await call(desk, '/api/board');
    const board = boardResponse.body as {
      live: boolean;
      members: {
        id: string;
        displayName: string;
        goal: number | null;
        baseline: number | null;
        monthAdded: number | null;
        current: number | null;
        completionRatio: number | null;
        milestones: number[];
        lines: string[];
        days: { value: number | null; kind: string }[];
      }[];
      group: { meanCompletion: number | null; text: string; units: unknown[] };
    };
    assert.equal(board.live, false);
    assert.equal(board.members.length, seed.participants.length);
    assert.equal(board.group.meanCompletion, null);
    assert.equal(board.group.units.length, 0);
    assert.equal(board.group.text.includes('%'), false);
    const boardText = JSON.stringify(board);

    for (const person of seed.participants) {
      const member = board.members.find((item) => item.displayName === person.display_name);
      assert.ok(member, person.display_name);
      assert.equal(member.goal, null);
      assert.equal(member.baseline, null);
      assert.equal(member.monthAdded, null);
      assert.equal(member.current, null);
      assert.equal(member.completionRatio, null);
      assert.deepEqual(member.milestones, []);
      assert.equal(member.lines.some((line) => line.includes('0')), false);
      assert.equal(member.days.every((day) => day.value == null && day.kind === 'not-counting'), true);
      if (person.stated_goals) assert.equal(boardText.includes(person.stated_goals), false);
      if (person.reported_progress_note) assert.equal(boardText.includes(person.reported_progress_note), false);
    }
    for (const hold of seed.review_only.ambiguous_participants) {
      assert.equal(boardText.includes(hold.display_name), false);
      assert.equal(boardText.includes(hold.note), false);
    }
    if (seed.source_url) assert.equal(boardText.includes(seed.source_url), false);
    if (seed.review_only.instruction) assert.equal(boardText.includes(seed.review_only.instruction), false);

    const roster = await call(desk, '/api/admin/roster', { bearer: ADMIN });
    const admin = roster.body as {
      enrolled: { displayName: string; goal: number | null; logCount: number; monthAdded: number | null; progressNote: string | null; statedGoals: string | null; editKey: string }[];
      held: { displayName: string }[];
    };
    assert.equal(admin.enrolled.length, seed.participants.length);
    assert.equal(admin.held.length, seed.review_only.ambiguous_participants.length);
    for (const person of seed.participants) {
      const row = admin.enrolled.find((item) => item.displayName === person.display_name)!;
      assert.equal(row.goal, null);
      assert.equal(row.logCount, 0);
      assert.equal(row.monthAdded, null);
      assert.equal(boardText.includes(row.editKey), false);
      if (row.progressNote) assert.equal(boardText.includes(row.progressNote), false);
      if (row.statedGoals) assert.equal(boardText.includes(row.statedGoals), false);
    }

    const first = admin.enrolled[0]!;
    const login = await call(desk, '/api/session', { method: 'POST', body: { participantId: board.members.find((member) => member.displayName === first.displayName)!.id, editKey: first.editKey } });
    const me = await call(desk, '/api/me', { cookie: sessionCookie(login.headers, 'pen_member') });
    const mine = me.body as { progressNote: string | null; statedGoals: string | null; goal: number | null };
    assert.equal(mine.goal, null);
    assert.equal(mine.statedGoals, first.statedGoals);
    assert.equal(mine.progressNote, first.progressNote);
    const otherNote = admin.enrolled.find((person) => person.displayName !== first.displayName)?.progressNote;
    if (otherNote) assert.equal(JSON.stringify(me.body).includes(otherNote), false);

    const page = await call(desk, '/');
    const script = await call(desk, '/app.js');
    for (const person of seed.participants) {
      assert.equal(page.text.includes(person.display_name), false);
      assert.equal(script.text.includes(person.display_name), false);
      if (person.stated_goals) assert.equal(script.text.includes(person.stated_goals), false);
    }
    for (const hold of seed.review_only.ambiguous_participants) {
      assert.equal(page.text.includes(hold.display_name), false);
      assert.equal(script.text.includes(hold.display_name), false);
    }
  });
});
