// Date maths for the create page's calendar. Dates are 'YYYY-MM-DD' strings throughout (the
// same as the API), worked on as UTC so no local timezone or DST can shift a day. Because the
// format is fixed-width, plain string comparison is also date order.

import type { PaintMode } from './grid';

const DAY_MS = 86_400_000;

function toTime(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`);
}

function fromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  return fromTime(toTime(ymd) + days * DAY_MS);
}

// 0 = Sunday ... 6 = Saturday, like Date.getDay().
export function dayOfWeek(ymd: string): number {
  return new Date(toTime(ymd)).getUTCDay();
}

export function ymdOf(year: number, month: number, day: number): string {
  return fromTime(Date.UTC(year, month, day));
}

// The weeks shown for a month (month is 0-11), each 7 days starting on `weekStartsOn`
// (0 = Sunday, 1 = Monday). Includes the days of the neighbouring months that fill the
// first and last rows.
export function monthWeeks(year: number, month: number, weekStartsOn: number): string[][] {
  const first = ymdOf(year, month, 1);
  const last = ymdOf(year, month + 1, 0);
  let day = addDays(first, -((dayOfWeek(first) - weekStartsOn + 7) % 7));
  const weeks: string[][] = [];
  while (day <= last) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Every day from a to b inclusive, in either order. Dragging across the calendar selects
// consecutive days (like selecting text), not a rectangle.
export function daysBetween(a: string, b: string): string[] {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Monday to Friday of a calendar row, whichever day the row starts on.
export function workdaysOf(week: string[]): string[] {
  return week.filter((day) => {
    const dow = dayOfWeek(day);
    return dow >= 1 && dow <= 5;
  });
}

// Every date in the month that falls on `weekday` (0 = Sunday).
export function monthDaysOn(year: number, month: number, weekday: number): string[] {
  const days: string[] = [];
  const last = ymdOf(year, month + 1, 0);
  for (let day = ymdOf(year, month, 1); day <= last; day = addDays(day, 1)) {
    if (dayOfWeek(day) === weekday) days.push(day);
  }
  return days;
}

// A group click (a week, a weekday column) removes the group if it's all selected already,
// and otherwise fills it in.
export function groupMode(selected: ReadonlySet<string>, group: string[]): PaintMode {
  return group.length > 0 && group.every((day) => selected.has(day)) ? 'remove' : 'add';
}

// Adds or removes days, never going past `max` dates. Adds the earliest days first, so a
// range that hits the limit fills from its start. Returns the result sorted, and whether
// any day was left out because of the limit.
export function applyDays(
  selected: ReadonlySet<string>,
  days: string[],
  mode: PaintMode,
  max: number,
): { dates: string[]; hitLimit: boolean } {
  const next = new Set(selected);
  let hitLimit = false;
  for (const day of [...days].sort()) {
    if (mode === 'remove') next.delete(day);
    else if (next.has(day)) continue;
    else if (next.size < max) next.add(day);
    else hitLimit = true;
  }
  return { dates: [...next].sort(), hitLimit };
}

// The first day of the week for a locale, as 0 = Sunday ... 6 = Saturday. Uses
// Intl.Locale's week info where the browser has it, and Monday otherwise.
export function localeWeekStart(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay; // 1 = Mon ... 7 = Sun
    return firstDay ? firstDay % 7 : 1;
  } catch {
    return 1;
  }
}
