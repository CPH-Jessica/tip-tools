import type { Participant } from './db.ts';
import {
  MONTH,
  WEEKDAY_SHORT,
  formatLongDate,
  groupFromMembers,
  monthPhase,
  novemberDates,
  viewTracker,
  weekdayIndex,
  zoneLabel,
  type DayView,
  type GroupView,
  type TrackerView,
} from './progress.ts';
import type { Unit } from './validate.ts';
import type { LogRecord } from './progress.ts';

export type BoardMember = {
  id: string;
  displayName: string;
  unit: Unit | null;
  customUnitLabel: string | null;
  goal: number | null;
  baseline: number | null;
  startDate: string | null;
  tracking: boolean;
  monthAdded: number | null;
  current: number | null;
  completionRatio: number | null;
  expectedCurrent: number | null;
  paceText: string;
  milestones: number[];
  milestoneText: string | null;
  lines: string[];
  counts: TrackerView['counts'];
  days: DayView[];
};

export type PrivateMember = BoardMember & {
  statedGoals: string | null;
  progressNote: string | null;
};

export function toBoardMember(person: Participant, logs: LogRecord[], today: string): BoardMember {
  const view = viewTracker({
    unit: person.unit,
    customUnitLabel: person.customUnitLabel,
    goal: person.goal,
    baseline: person.baseline,
    startDate: person.startDate,
    logs,
    today,
  });
  return {
    id: person.id,
    displayName: person.displayName,
    unit: person.unit,
    customUnitLabel: person.customUnitLabel,
    goal: person.goal,
    baseline: person.baseline,
    startDate: person.startDate,
    tracking: view.tracking,
    monthAdded: view.monthAdded,
    current: view.current,
    completionRatio: view.completionRatio,
    expectedCurrent: view.expectedCurrent,
    paceText: view.paceText,
    milestones: view.milestones,
    milestoneText: view.milestoneText,
    lines: view.lines,
    counts: view.counts,
    days: view.days,
  };
}

export function toPrivateMember(person: Participant, logs: LogRecord[], today: string): PrivateMember {
  return {
    ...toBoardMember(person, logs, today),
    statedGoals: person.statedGoals,
    progressNote: person.progressNote,
  };
}

export function buildCalendar(today: string) {
  return {
    title: 'November 2026',
    caption: 'November 2026. Dates only. This grid is not a score, and it does not mark anyone absent.',
    weekdayLabels: WEEKDAY_SHORT,
    lead: weekdayIndex('2026-11-01'),
    today,
    phase: monthPhase(today),
    cells: novemberDates().map((date) => ({
      date,
      dayOfMonth: Number(date.slice(-2)),
      weekday: weekdayIndex(date),
      label: formatLongDate(date),
      isToday: date === today,
      isFuture: date > today,
    })),
  };
}

export function buildBoard(
  people: Participant[],
  logs: { participantId: string; date: string; rest: boolean; value: number | null }[],
  today: string,
  timeZone: string,
) {
  const byPerson = new Map<string, LogRecord[]>();
  for (const log of logs) {
    const list = byPerson.get(log.participantId) ?? [];
    list.push(log);
    byPerson.set(log.participantId, list);
  }
  const members = people.map((person) => toBoardMember(person, byPerson.get(person.id) ?? [], today));
  const group: GroupView = groupFromMembers(
    members.map((member) => ({
      unit: member.unit,
      customUnitLabel: member.customUnitLabel,
      goal: member.goal,
      baseline: member.baseline,
      startDate: member.startDate,
      logged: {
        sum: member.monthAdded ?? 0,
        count: member.monthAdded == null ? 0 : member.counts.logged,
      },
      completionRatio: member.completionRatio,
      tracking: member.tracking,
      todayKind: member.days.find((day) => day.date === today)?.kind ?? 'not-counting',
    })),
  );
  const phase = monthPhase(today);
  const todayText = formatLongDate(today);
  let clock = `Today on this desk: ${todayText} (${zoneLabel(timeZone)}).`;
  if (phase === 'before') clock = `November 2026 has not started on this desk. The clock says ${todayText}.`;
  if (phase === 'after') clock = `November 2026 is over on this desk. Blank days stay blank. The clock says ${todayText}.`;
  return {
    month: MONTH,
    today,
    timezone: timeZone,
    timezoneLabel: zoneLabel(timeZone),
    phase,
    live: false as const,
    mode: 'local-draft' as const,
    clock,
    calendar: buildCalendar(today),
    members,
    group,
  };
}
