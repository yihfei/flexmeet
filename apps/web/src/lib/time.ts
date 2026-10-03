export const MINUTES_PER_DAY = 24 * 60;

// '09:30' (what <input type="time"> gives you) -> 570 minutes after midnight.
export function timeToMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

// 570 -> '09:30'. 1440 (end of day) -> '24:00'.
export function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Today's date in the user's local timezone as 'YYYY-MM-DD'.
// (toISOString() would give the UTC date, which is wrong near midnight.)
export function todayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 'YYYY-MM-DD' parses as UTC midnight, so format in UTC to keep the same calendar day.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function formatYmd(ymd: string): string {
  return dateFormatter.format(new Date(ymd));
}
