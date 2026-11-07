import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  daysInclusive,
  expectedCurrent,
  groupFromMembers,
  todayISO,
  viewTracker,
  warmCopyIssues,
  weekdayIndex,
  type TrackerInput,
} from './progress.ts';

const base: TrackerInput = {
  unit: 'words',
  customUnitLabel: null,
  goal: 30000,
  baseline: 0,
  startDate: '2026-11-01',
  today: '2026-11-07',
  logs: [],
};

test('November 2026 has 30 days and starts on Sunday', () => {
  assert.equal(daysInclusive('2026-11-01', '2026-11-30'), 30);
  assert.equal(daysInclusive('2026-11-10', '2026-11-30'), 21);
  assert.equal(weekdayIndex('2026-11-01'), 0);
  assert.equal(weekdayIndex('2026-11-07'), 6);
});

test('the desk clock follows the community time zone', () => {
  assert.equal(todayISO(new Date('2026-11-08T04:30:00Z'), 'America/New_York'), '2026-11-07');
  assert.equal(todayISO(new Date('2026-11-08T05:30:00Z'), 'America/New_York'), '2026-11-08');
});

test('unreported days are not zeros and a repeated day replaces the amount', () => {
  const view = viewTracker({
    ...base,
    logs: [
      { date: '2026-11-02', rest: false, value: 100 },
      { date: '2026-11-02', rest: false, value: 40 },
    ],
  });
  assert.equal(view.monthAdded, 40);
  assert.equal(view.current, 40);
  assert.equal(view.days.find((day) => day.date === '2026-11-03')?.kind, 'unreported');
  assert.equal(view.days.find((day) => day.date === '2026-11-03')?.value, null);
  assert.equal(view.days.find((day) => day.date === '2026-11-03')?.mark, 'Unreported');
  assert.equal(view.counts.logged, 1);
  assert.equal(view.counts.unreported, 6);
  assert.equal(view.counts.future, 23);
  assert.equal(view.days.filter((day) => day.mark === 'Logged 0').length, 0);
});

test('an explicit zero is stored and a blank day is not', () => {
  const view = viewTracker({ ...base, logs: [{ date: '2026-11-02', rest: false, value: 0 }] });
  assert.equal(view.monthAdded, 0);
  assert.equal(view.days.find((day) => day.date === '2026-11-02')?.mark, 'Logged 0');
  assert.equal(view.days.find((day) => day.date === '2026-11-01')?.mark, 'Unreported');
  assert.match(view.lines.join(' '), /Logged this month: 0 words/);
});

test('rest days add nothing and are not unreported', () => {
  const view = viewTracker({ ...base, logs: [{ date: '2026-11-02', rest: true, value: null }] });
  assert.equal(view.monthAdded, null);
  assert.equal(view.counts.rest, 1);
  assert.equal(view.counts.unreported, 6);
  assert.equal(view.days.find((day) => day.date === '2026-11-02')?.mark, 'Rest');
  assert.equal(view.current, 0);
});

test('future amounts and days before the start date are not counted', () => {
  const future = viewTracker({ ...base, logs: [{ date: '2026-11-08', rest: false, value: 500 }] });
  assert.equal(future.monthAdded, null);
  assert.equal(future.days.find((day) => day.date === '2026-11-08')?.kind, 'future');
  assert.equal(future.days.find((day) => day.date === '2026-11-08')?.value, null);

  const early = viewTracker({
    ...base,
    startDate: '2026-11-10',
    today: '2026-11-20',
    logs: [{ date: '2026-11-06', rest: false, value: 80 }],
  });
  assert.equal(early.monthAdded, null);
  assert.equal(early.days.find((day) => day.date === '2026-11-06')?.kind, 'before-start');
  assert.equal(expectedCurrent(210, 0, '2026-11-10', '2026-11-20'), 110);
});

test('pace uses the start date and does not scold', () => {
  const quiet = viewTracker(base);
  assert.equal(quiet.expectedCurrent, 7000);
  assert.match(quiet.paceText, /7,000/);
  assert.match(quiet.paceText, /not added as zeros/);
  assert.deepEqual(warmCopyIssues(quiet.paceText), []);

  const waiting = viewTracker({ ...base, startDate: '2026-11-20' });
  assert.match(waiting.paceText, /Counting begins/);
  assert.equal(waiting.days.find((day) => day.date === '2026-11-07')?.kind, 'before-start');
  assert.equal(waiting.days.find((day) => day.date === '2026-11-08')?.kind, 'future');
});

test('baseline is included once', () => {
  const view = viewTracker({
    ...base,
    baseline: 1000,
    goal: 5000,
    logs: [
      { date: '2026-11-03', rest: false, value: 200 },
      { date: '2026-11-04', rest: false, value: 50 },
    ],
  });
  assert.equal(view.monthAdded, 250);
  assert.equal(view.current, 1250);
  assert.equal(view.completionRatio, 0.25);
  assert.deepEqual(view.milestones, [25]);
});

test('an unset goal has no percent, no milestone, and no invented zero', () => {
  const view = viewTracker({
    unit: null,
    customUnitLabel: null,
    goal: null,
    baseline: null,
    startDate: null,
    today: '2026-11-07',
    logs: [],
  });
  assert.equal(view.tracking, false);
  assert.equal(view.monthAdded, null);
  assert.equal(view.current, null);
  assert.equal(view.completionRatio, null);
  assert.deepEqual(view.milestones, []);
  assert.deepEqual(view.lines, ['Goal not set.', 'Not counting yet.', 'Nothing logged yet.']);
  assert.equal(view.lines.some((line) => line.includes('0')), false);
  assert.equal(view.days.every((day) => day.kind === 'not-counting' && day.value == null), true);
});

test('unlike units are averaged as completion and never added', () => {
  const group = groupFromMembers([
    {
      unit: 'words',
      customUnitLabel: null,
      goal: 2000,
      baseline: 0,
      startDate: '2026-11-01',
      logged: { sum: 1000, count: 1 },
      completionRatio: 0.5,
      tracking: true,
      todayKind: 'logged',
    },
    {
      unit: 'chapters',
      customUnitLabel: null,
      goal: 3,
      baseline: 0,
      startDate: '2026-11-01',
      logged: { sum: 3, count: 1 },
      completionRatio: 1,
      tracking: true,
      todayKind: 'logged',
    },
    {
      unit: 'custom',
      customUnitLabel: 'poems',
      goal: 4,
      baseline: 0,
      startDate: '2026-11-01',
      logged: { sum: 2, count: 1 },
      completionRatio: 0.5,
      tracking: true,
      todayKind: 'unreported',
    },
    {
      unit: 'custom',
      customUnitLabel: 'pages',
      goal: 8,
      baseline: 0,
      startDate: '2026-11-01',
      logged: { sum: 4, count: 1 },
      completionRatio: 0.5,
      tracking: true,
      todayKind: 'rest',
    },
  ]);
  assert.equal(group.meanCompletion, 0.625);
  assert.equal(group.units.length, 4);
  assert.equal(group.units.find((unit) => unit.key === 'words')?.explicitSum, 1000);
  assert.equal(group.units.find((unit) => unit.key === 'chapters')?.explicitSum, 3);
  assert.equal(group.units.find((unit) => unit.key === 'custom:poems')?.explicitSum, 2);
  assert.equal(group.units.find((unit) => unit.key === 'custom:pages')?.explicitSum, 4);
  const blob = JSON.stringify(group);
  assert.equal(blob.includes('1003'), false);
  assert.equal(blob.includes('1006'), false);
  assert.match(group.text, /not a ranking/);
  assert.deepEqual(warmCopyIssues(group.text), []);
});

test('no goals means no room average', () => {
  const group = groupFromMembers([
    {
      unit: null,
      customUnitLabel: null,
      goal: null,
      baseline: null,
      startDate: null,
      logged: { sum: 0, count: 0 },
      completionRatio: null,
      tracking: false,
      todayKind: 'not-counting',
    },
  ]);
  assert.equal(group.meanCompletion, null);
  assert.equal(group.units.length, 0);
  assert.match(group.text, /no progress total/);
  assert.equal(group.text.includes('%'), false);
  assert.equal(group.text.includes('0'), false);
});
