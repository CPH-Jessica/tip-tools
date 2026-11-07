import type { Unit } from './validate.ts';
import { isNovember2026 } from './validate.ts';

export const MONTH = '2026-11';
export const MONTH_START = '2026-11-01';
export const MONTH_END = '2026-11-30';
export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type DayKind = 'not-counting' | 'before-start' | 'future' | 'rest' | 'logged' | 'unreported';

export interface LogRecord {
  date: string;
  rest: boolean;
  value: number | null;
}

export interface DayView {
  date: string;
  dayOfMonth: number;
  weekday: number;
  label: string;
  kind: DayKind;
  value: number | null;
  counted: boolean;
  mark: string;
}

export interface TrackerInput {
  unit: Unit | null;
  customUnitLabel: string | null;
  goal: number | null;
  baseline: number | null;
  startDate: string | null;
  logs: LogRecord[];
  today: string;
}

export interface TrackerView {
  tracking: boolean;
  monthAdded: number | null;
  current: number | null;
  completionRatio: number | null;
  expectedCurrent: number | null;
  paceText: string;
  milestones: number[];
  milestoneText: string | null;
  lines: string[];
  counts: {
    logged: number;
    rest: number;
    unreported: number;
    future: number;
    notCounting: number;
    beforeStart: number;
  };
  days: DayView[];
  logged: { sum: number; count: number };
  todayKind: DayKind;
}

const WARM_BANS = [
  /\bbehind\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bmissed\b/i,
  /\bshame\b/i,
  /\blast place\b/i,
  /\bcatch up\b/i,
  /\byou should\b/i,
  /\bguilty\b/i,
  /\bloser\b/i,
  /\branked\b/i,
  /\branks\b/i,
];

export function warmCopyIssues(text: string): string[] {
  const scrubbed = text.replace(/not a ranking/gi, '');
  return WARM_BANS.filter((pattern) => pattern.test(scrubbed)).map((pattern) => pattern.source);
}

export function novemberDates(): string[] {
  return Array.from({ length: 30 }, (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`);
}

export function weekdayIndex(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function daysInclusive(start: string, end: string): number {
  if (end < start) return 0;
  const span = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(span / 86400000) + 1;
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, (month ?? 1) - 1, day ?? 1, 12)));
}

export function formatExact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const negative = value < 0;
  const absolute = Math.abs(Math.round(value * 100) / 100);
  const [whole, fraction] = absolute.toFixed(2).split('.');
  const withCommas = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let tail = '';
  if (fraction && fraction !== '00') tail = fraction.endsWith('0') ? `.${fraction[0]}` : `.${fraction}`;
  return `${negative ? '-' : ''}${withCommas}${tail}`;
}

export function formatAbout(value: number): string {
  return formatExact(Math.round(value));
}

export function formatPercent(ratio: number): string {
  const percent = ratio * 100;
  if (percent >= 10 || percent === 0) return `${Math.round(percent)}%`;
  return `${Math.round(percent * 10) / 10}%`;
}

export function unitWord(unit: Unit, custom: string | null, count: number): string {
  if (unit === 'custom') return custom?.trim() || 'units';
  const singular = Math.abs(count) === 1;
  const words: Record<Exclude<Unit, 'custom'>, [string, string]> = {
    words: ['word', 'words'],
    chapters: ['chapter', 'chapters'],
    scenes: ['scene', 'scenes'],
    sessions: ['session', 'sessions'],
    minutes: ['minute', 'minutes'],
  };
  const pair = words[unit];
  return singular ? pair[0] : pair[1];
}

export function unitHeading(unit: Unit, custom: string | null): string {
  if (unit === 'custom') return custom?.trim() || 'Custom';
  const headings: Record<Exclude<Unit, 'custom'>, string> = {
    words: 'Words',
    chapters: 'Chapters',
    scenes: 'Scenes',
    sessions: 'Sessions',
    minutes: 'Minutes',
  };
  return headings[unit];
}

export function monthPhase(today: string): 'before' | 'during' | 'after' {
  if (today < MONTH_START) return 'before';
  if (today > MONTH_END) return 'after';
  return 'during';
}

export function todayISO(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

const ZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern time',
  'America/Chicago': 'Central time',
  'America/Denver': 'Mountain time',
  'America/Los_Angeles': 'Pacific time',
  'America/Phoenix': 'Arizona time',
  UTC: 'UTC',
};

export function zoneLabel(timeZone: string): string {
  return ZONE_LABELS[timeZone] ?? timeZone;
}

export function isTracking(input: Pick<TrackerInput, 'unit' | 'goal' | 'baseline' | 'startDate'>): boolean {
  return (
    input.unit != null &&
    input.goal != null &&
    input.goal > 0 &&
    input.baseline != null &&
    input.startDate != null &&
    isNovember2026(input.startDate)
  );
}

function normalizeLogs(logs: LogRecord[]): Map<string, LogRecord> {
  const map = new Map<string, LogRecord>();
  for (const log of logs) {
    if (!isNovember2026(log.date)) continue;
    map.set(log.date, log);
  }
  return map;
}

export function dayKind(date: string, startDate: string | null, today: string, log?: LogRecord): DayKind {
  if (!isNovember2026(date)) return 'not-counting';
  if (startDate == null || !isNovember2026(startDate)) return 'not-counting';
  if (date > today) return 'future';
  if (date < startDate) return 'before-start';
  if (!log) return 'unreported';
  if (log.rest) return 'rest';
  if (typeof log.value === 'number' && Number.isFinite(log.value)) return 'logged';
  return 'unreported';
}

function markFor(kind: DayKind, value: number | null): string {
  if (kind === 'logged' && value != null) return `Logged ${formatExact(value)}`;
  if (kind === 'rest') return 'Rest';
  if (kind === 'unreported') return 'Unreported';
  if (kind === 'future') return 'Ahead';
  if (kind === 'before-start') return 'Before start';
  return 'Not counting';
}

export function expectedCurrent(goal: number, baseline: number, startDate: string, today: string): number {
  const work = Math.max(0, goal - baseline);
  if (today < startDate) return baseline;
  const end = today > MONTH_END ? MONTH_END : today;
  const window = daysInclusive(startDate, MONTH_END);
  const opened = daysInclusive(startDate, end);
  if (window <= 0) return baseline;
  return baseline + (work * opened) / window;
}

export function milestonesReached(ratio: number | null): number[] {
  if (ratio == null || ratio < 0.25) return [];
  return [25, 50, 75, 100].filter((level) => ratio + 1e-9 >= level / 100);
}

export function milestoneMessage(level: number): string {
  if (level === 25) return 'A quarter of the goal you set is on the page.';
  if (level === 50) return 'Halfway to the goal you set. That is a solid stretch of work.';
  if (level === 75) return 'Three quarters of the goal you set. November still has days in it.';
  if (level === 100) return 'The goal you set is met. Anything more is extra ink.';
  return '';
}

export function paceText(input: TrackerInput, logged: { sum: number; count: number }): string {
  if (!isTracking(input) || input.unit == null || input.goal == null || input.baseline == null || input.startDate == null) {
    return 'No goal set yet. Choose a unit, a baseline, a total, and a start date when you are ready. This desk will not invent them.';
  }
  const current = input.baseline + (logged.count ? logged.sum : 0);
  if (input.goal > 0 && current >= input.goal) {
    return 'The goal you set is met. Further logging is optional, and a rest day still counts as an honest day.';
  }
  if (input.today < input.startDate) {
    return `Counting begins ${formatLongDate(input.startDate)}. Days before that are not on this goal.`;
  }
  const expected = expectedCurrent(input.goal, input.baseline, input.startDate, input.today);
  const loggedSentence =
    logged.count === 0
      ? 'Nothing has been logged yet, so blank days are not added as zeros.'
      : `Logged amounts add up to ${formatExact(logged.sum)} ${unitWord(input.unit, input.customUnitLabel, logged.sum)}.`;
  const tolerance = Math.max(1, Math.max(0, input.goal - input.baseline) * 0.1);
  if (logged.count > 0 && current > expected + tolerance) {
    return `${loggedSentence} That is ahead of a steady pace from your start date. No need to hurry.`;
  }
  const expectedUnit = unitWord(input.unit, input.customUnitLabel, Math.round(expected));
  return `${loggedSentence} A steady pace, spread from your start date through November 30, would be about ${formatAbout(expected)} ${expectedUnit} by the end of today, including your baseline.`;
}

function summaryLines(input: TrackerInput, logged: { sum: number; count: number }, ratio: number | null, counts: TrackerView['counts']): string[] {
  if (!isTracking(input) || input.unit == null || input.goal == null || input.baseline == null) {
    const lines = ['Goal not set.', 'Not counting yet.'];
    if (logged.count === 0) lines.push('Nothing logged yet.');
    else lines.push(`Logged this month: ${formatExact(logged.sum)} ${input.unit ? unitWord(input.unit, input.customUnitLabel, logged.sum) : 'units'}.`);
    return lines;
  }
  const lines = [
    `Goal: ${formatExact(input.goal)} ${unitWord(input.unit, input.customUnitLabel, input.goal)}.`,
    `Baseline: ${formatExact(input.baseline)} ${unitWord(input.unit, input.customUnitLabel, input.baseline)}.`,
  ];
  if (logged.count === 0) lines.push('Nothing logged yet. Blank days are not zeros.');
  else lines.push(`Logged this month: ${formatExact(logged.sum)} ${unitWord(input.unit, input.customUnitLabel, logged.sum)}.`);
  const current = input.baseline + (logged.count ? logged.sum : 0);
  lines.push(`Counting toward the goal: ${formatExact(current)} ${unitWord(input.unit, input.customUnitLabel, current)}.`);
  if (ratio != null && ratio > 0) lines.push(`${formatPercent(ratio)} of the goal you set.`);
  if (ratio === 0) lines.push('Nothing logged has been added toward the goal you set.');
  if (counts.unreported > 0) lines.push(`Unreported days: ${counts.unreported}. These are not zeros.`);
  if (counts.rest > 0) lines.push(`Rest days: ${counts.rest}.`);
  if (counts.logged > 0) lines.push(`Logged days: ${counts.logged}.`);
  return lines;
}

export function viewTracker(input: TrackerInput): TrackerView {
  const logs = normalizeLogs(input.logs);
  const tracking = isTracking(input);
  const counts = { logged: 0, rest: 0, unreported: 0, future: 0, notCounting: 0, beforeStart: 0 };
  let sum = 0;
  let count = 0;
  const days = novemberDates().map((date) => {
    const log = logs.get(date);
    const kind = dayKind(date, input.startDate, input.today, log);
    const value = kind === 'logged' && log && typeof log.value === 'number' ? log.value : null;
    if (kind === 'logged' && value != null) {
      counts.logged += 1;
      sum += value;
      count += 1;
    } else if (kind === 'rest') counts.rest += 1;
    else if (kind === 'unreported') counts.unreported += 1;
    else if (kind === 'future') counts.future += 1;
    else if (kind === 'before-start') counts.beforeStart += 1;
    else counts.notCounting += 1;
    return {
      date,
      dayOfMonth: Number(date.slice(-2)),
      weekday: weekdayIndex(date),
      label: formatLongDate(date),
      kind,
      value,
      counted: kind === 'logged',
      mark: markFor(kind, value),
    };
  });
  const logged = { sum, count };
  const monthAdded = count === 0 ? null : sum;
  const current = input.baseline == null && count === 0 ? null : (input.baseline ?? 0) + (count ? sum : 0);
  const completionRatio =
    tracking && input.goal != null && input.goal > 0 && input.baseline != null ? current! / input.goal : null;
  const milestones = milestonesReached(completionRatio);
  const highest = milestones.length ? milestones[milestones.length - 1]! : null;
  const today = days.find((day) => day.date === input.today);
  return {
    tracking,
    monthAdded,
    current: input.baseline == null && count === 0 ? null : current,
    completionRatio,
    expectedCurrent:
      tracking && input.goal != null && input.baseline != null && input.startDate != null
        ? expectedCurrent(input.goal, input.baseline, input.startDate, input.today)
        : null,
    paceText: paceText(input, logged),
    milestones,
    milestoneText: highest == null ? null : milestoneMessage(highest),
    lines: summaryLines(input, logged, completionRatio, counts),
    counts,
    days,
    logged,
    todayKind: today?.kind ?? (input.today > MONTH_END || input.today < MONTH_START ? 'future' : 'not-counting'),
  };
}

export interface GroupMember {
  unit: Unit | null;
  customUnitLabel: string | null;
  goal: number | null;
  baseline: number | null;
  startDate: string | null;
  logged: { sum: number; count: number };
  completionRatio: number | null;
  tracking: boolean;
  todayKind: DayKind;
}

export interface UnitBucket {
  key: string;
  label: string;
  explicitSum: number | null;
  line: string;
}

export interface GroupView {
  enrolled: number;
  withGoals: number;
  meanCompletion: number | null;
  entriesToday: number;
  units: UnitBucket[];
  text: string;
}

export function groupFromMembers(members: GroupMember[]): GroupView {
  const ratios: number[] = [];
  const buckets = new Map<string, { label: string; sum: number; count: number }>();
  let entriesToday = 0;
  let withGoals = 0;
  for (const member of members) {
    if (member.todayKind === 'logged' || member.todayKind === 'rest') entriesToday += 1;
    if (!member.tracking || member.unit == null || member.completionRatio == null) continue;
    withGoals += 1;
    ratios.push(member.completionRatio);
    const key = member.unit === 'custom' ? `custom:${(member.customUnitLabel ?? '').trim().toLocaleLowerCase('en-US')}` : member.unit;
    const label = unitHeading(member.unit, member.customUnitLabel);
    const bucket = buckets.get(key) ?? { label, sum: 0, count: 0 };
    bucket.count += member.logged.count;
    if (member.logged.count) bucket.sum += member.logged.sum;
    buckets.set(key, bucket);
  }
  const units = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    explicitSum: bucket.count === 0 ? null : bucket.sum,
    line:
      bucket.count === 0
        ? `${bucket.label}: nothing logged yet.`
        : `${bucket.label} logged this month: ${formatExact(bucket.sum)}.`,
  }));
  const meanCompletion = ratios.length ? ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length : null;
  return {
    enrolled: members.length,
    withGoals,
    meanCompletion,
    entriesToday,
    units,
    text: groupText({ enrolled: members.length, withGoals, meanCompletion }),
  };
}

export function groupText(group: { enrolled: number; withGoals: number; meanCompletion: number | null }): string {
  const unitNote = 'The average uses each writer’s completion of their own goal. Different units are not added together. This is not a ranking.';
  if (group.enrolled === 0) {
    return 'No opt-ins have been imported. There are no sample writers and no sample totals on this desk.';
  }
  if (group.withGoals === 0) {
    const noun = group.enrolled === 1 ? 'writer is' : 'writers are';
    return `${group.enrolled} ${noun} on the desk. No monthly targets have been entered, so there is no average and no progress total.`;
  }
  if (group.meanCompletion == null || group.meanCompletion === 0) {
    return `${group.withGoals} of ${group.enrolled} have a goal set. Nothing logged has been added, so there is no progress total. ${unitNote}`;
  }
  return `Taken together, writers who set a goal are at about ${formatPercent(group.meanCompletion)} of those goals. ${group.withGoals} of ${group.enrolled} have a goal set. ${unitNote}`;
}
