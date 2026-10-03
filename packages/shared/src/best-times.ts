import type { ParticipantResponse } from './participant.js';
import { slotKey, slotStartMinutes, type EventGrid } from './slots.js';

// A meeting-length window on one date, and who can make all of it.
export interface TimeWindow {
  date: string; // 'YYYY-MM-DD'
  startMinute: number;
  endMinute: number; // exclusive
  free: string[]; // names, in the participants' order
  missing: string[];
}

// Who is free when, prepared once so that trying several meeting lengths is cheap.
// runs[person][date][row] is how many slots in a row that person is free from that row on,
// so they can make a window of `span` slots starting at `row` if the run is >= span.
export interface AvailabilityIndex {
  event: EventGrid;
  participants: ParticipantResponse[];
  minutes: number[]; // start minute of each row
  runs: number[][][];
}

export function availabilityIndex(
  event: EventGrid,
  participants: ParticipantResponse[],
): AvailabilityIndex {
  const minutes = slotStartMinutes(event);
  // Build each date's slot keys once, rather than once per person.
  const keys = event.dates.map((date) => minutes.map((m) => slotKey(date, m)));
  const runs = participants.map((p) => {
    const slots = new Set(p.slots);
    return keys.map((dayKeys) => {
      const run = new Array<number>(dayKeys.length + 1).fill(0);
      for (let i = dayKeys.length - 1; i >= 0; i--) {
        run[i] = slots.has(dayKeys[i]!) ? run[i + 1]! + 1 : 0;
      }
      return run;
    });
  });
  return { event, participants, minutes, runs };
}

// The best windows of `lengthMinutes`: ranked by how many people are free for the whole
// window, then earliest date, then earliest time. Windows that overlap a better one on the
// same date are dropped, so the list doesn't offer 14:00, 14:30 and 15:00 as three
// "different" options. Windows nobody can make are left out.
//
// Returns [] when the length isn't a whole number of slots or is longer than a day's window.
export function bestTimes(
  index: AvailabilityIndex,
  lengthMinutes: number,
  limit = 5,
): TimeWindow[] {
  const { event, participants, minutes, runs } = index;
  const span = lengthMinutes / event.slotMinutes; // slots per window
  if (!Number.isInteger(span) || span < 1 || span > minutes.length) return [];

  // Count first; names are only built for the few windows that are returned.
  const candidates: { date: number; row: number; count: number }[] = [];
  for (let date = 0; date < event.dates.length; date++) {
    for (let row = 0; row + span <= minutes.length; row++) {
      let count = 0;
      for (const run of runs) if (run[date]![row]! >= span) count++;
      if (count > 0) candidates.push({ date, row, count });
    }
  }

  // Dates are 'YYYY-MM-DD', so string order is date order.
  candidates.sort(
    (a, b) =>
      b.count - a.count ||
      event.dates[a.date]!.localeCompare(event.dates[b.date]!) ||
      a.row - b.row,
  );

  const chosen: typeof candidates = [];
  for (const c of candidates) {
    if (chosen.length === limit) break;
    // Same date and less than a window apart means the two windows overlap.
    const overlaps = chosen.some((o) => o.date === c.date && Math.abs(o.row - c.row) < span);
    if (!overlaps) chosen.push(c);
  }

  return chosen.map(({ date, row }) => {
    const free: string[] = [];
    const missing: string[] = [];
    participants.forEach((p, n) => (runs[n]![date]![row]! >= span ? free : missing).push(p.name));
    const startMinute = minutes[row]!;
    return {
      date: event.dates[date]!,
      startMinute,
      endMinute: startMinute + lengthMinutes,
      free,
      missing,
    };
  });
}
