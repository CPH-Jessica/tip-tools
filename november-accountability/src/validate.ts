export const UNITS = ['words', 'chapters', 'scenes', 'sessions', 'minutes', 'custom'] as const;
export type Unit = (typeof UNITS)[number];

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'\u2019-]{0,39}$/u;
const LABEL = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .'\u2019-]{0,23}$/u;

export function isUnit(value: unknown): value is Unit {
  return typeof value === 'string' && (UNITS as readonly string[]).includes(value);
}

export function parseDisplayName(value: unknown): string | { error: string } {
  if (typeof value !== 'string') return { error: 'Each person needs a display name.' };
  const name = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!NAME.test(name) || name.length > 40 || /https?:|www\.|skool\.com/i.test(name)) {
    return { error: 'Use a display name of up to 40 letters, without links or comment text.' };
  }
  return name;
}

export function nameKey(name: string): string {
  return name.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

export function parseCustomLabel(value: unknown): string | { error: string } {
  if (typeof value !== 'string') return { error: 'A custom unit needs a short name, such as the word you actually count.' };
  const label = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!LABEL.test(label) || /https?:|www\.|skool\.com/i.test(label)) {
    return { error: 'Use a short custom unit name, without links.' };
  }
  return label;
}

export function parseNote(value: unknown, label: string): string | null | { error: string } {
  if (value == null) return null;
  if (typeof value !== 'string') return { error: `${label} must be text, or be left out.` };
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length > 2000) return { error: `${label} is too long to store.` };
  if (/https?:|www\.|skool\.com/i.test(text)) {
    return { error: `${label} contains a web address. This desk does not keep links.` };
  }
  if (/[<>]/.test(text)) return { error: `${label} contains characters this desk will not store.` };
  return text;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isNovember2026(value: string): boolean {
  return isIsoDate(value) && value >= '2026-11-01' && value <= '2026-11-30';
}

export function parseAmount(
  value: unknown,
  label: string,
  bounds: { min: number; max: number },
): number | { error: string } {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { error: `${label} needs a plain number.` };
  }
  const text = String(value);
  if (/e/i.test(text)) return { error: `${label} needs a plain number.` };
  const fraction = text.split('.')[1];
  if (fraction && fraction.length > 2) return { error: `${label} can have at most two decimal places.` };
  if (value < bounds.min) {
    return bounds.min === 0
      ? { error: `${label} cannot be negative. Leave a day blank if you do not want to record it.` }
      : { error: `${label} needs to be greater than zero.` };
  }
  if (value > bounds.max) return { error: `${label} is larger than this desk will store. Check the amount.` };
  return value;
}

export function parseNovemberDate(value: unknown, label: string): string | { error: string } {
  if (typeof value !== 'string' || !isNovember2026(value)) {
    return { error: `${label} needs a date from November 1 through November 30, 2026.` };
  }
  return value;
}

export type PlanInput = {
  unit: Unit;
  customUnitLabel: string | null;
  goal: number;
  baseline: number;
  startDate: string;
};

export function parsePlan(body: Record<string, unknown>): PlanInput | { error: string } {
  const allowed = new Set(['unit', 'customUnitLabel', 'goal', 'baseline', 'startDate', 'participantId']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) return { error: 'That field is not part of a goal.' };
  }
  if (!isUnit(body.unit)) return { error: 'Choose a unit: words, chapters, scenes, sessions, minutes, or custom.' };
  let custom: string | null = null;
  if (body.unit === 'custom') {
    const parsed = parseCustomLabel(body.customUnitLabel);
    if (typeof parsed !== 'string') return parsed;
    custom = parsed;
  } else if (body.customUnitLabel != null && String(body.customUnitLabel).trim() !== '') {
    return { error: 'A custom unit name is only kept when the unit is custom.' };
  }
  const goal = parseAmount(body.goal, 'The goal', { min: 0.01, max: 10_000_000 });
  if (typeof goal !== 'number') return goal;
  const baseline = parseAmount(body.baseline, 'The baseline', { min: 0, max: 10_000_000 });
  if (typeof baseline !== 'number') return baseline;
  const startDate = parseNovemberDate(body.startDate, 'The start date');
  if (typeof startDate !== 'string') return startDate;
  return { unit: body.unit, customUnitLabel: custom, goal, baseline, startDate };
}

export function parseDayWrite(
  body: Record<string, unknown>,
): { rest: boolean; value: number | null } | { error: string } {
  const allowed = new Set(['value', 'rest', 'participantId']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) return { error: 'That field is not part of a day.' };
  }
  const rest = body.rest === true;
  if (rest && body.value != null) return { error: 'Choose a number or a rest day, not both.' };
  if (rest) return { rest: true, value: null };
  const value = parseAmount(body.value, 'The amount', { min: 0, max: 1_000_000 });
  if (typeof value !== 'number') return value;
  return { rest: false, value };
}
