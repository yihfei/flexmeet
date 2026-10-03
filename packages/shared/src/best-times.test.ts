import { describe, expect, it } from 'vitest';
import { availabilityIndex, bestTimes } from './best-times.js';
import { slotKey } from './slots.js';

// Two dates, 09:00 to 12:00 in 30-minute slots: rows 540, 570, ..., 690.
const event = {
  dates: ['2026-10-12', '2026-10-13'],
  startMinute: 540,
  endMinute: 720,
  slotMinutes: 30,
};

// A person free on `date` from `from` until `to` (minutes, end exclusive).
function person(id: number, name: string, ...ranges: [string, number, number][]) {
  const slots = ranges.flatMap(([date, from, to]) => {
    const keys: string[] = [];
    for (let m = from; m < to; m += 30) keys.push(slotKey(date, m));
    return keys;
  });
  return { id, name, slots };
}

const MON = '2026-10-12';
const TUE = '2026-10-13';

describe('bestTimes', () => {
  it('ranks windows by how many people can make all of them', () => {
    const people = [
      person(1, 'Ana', [MON, 540, 720]),
      person(2, 'Ben', [MON, 600, 720]),
      person(3, 'Chi', [MON, 600, 660], [TUE, 540, 720]),
    ];
    const [best] = bestTimes(availabilityIndex(event, people), 60);
    expect(best).toEqual({
      date: MON,
      startMinute: 600,
      endMinute: 660,
      free: ['Ana', 'Ben', 'Chi'],
      missing: [],
    });
  });

  it('only counts people free for the whole window', () => {
    // Ben is free 09:00-09:30 and 10:00-10:30, never a full hour.
    const people = [
      person(1, 'Ana', [MON, 540, 720]),
      person(2, 'Ben', [MON, 540, 570], [MON, 600, 630]),
    ];
    const results = bestTimes(availabilityIndex(event, people), 60);
    expect(results.every((w) => w.free.length === 1)).toBe(true);
    expect(results[0]?.missing).toEqual(['Ben']);
  });

  it('breaks ties by earliest date, then earliest time', () => {
    const people = [person(1, 'Ana', [MON, 630, 690], [TUE, 540, 600])];
    const results = bestTimes(availabilityIndex(event, people), 60);
    expect(results.map((w) => [w.date, w.startMinute])).toEqual([
      [MON, 630],
      [TUE, 540],
    ]);
  });

  it('drops windows that overlap a better one on the same date, but not on other dates', () => {
    const people = [person(1, 'Ana', [MON, 540, 720], [TUE, 540, 720])];
    const results = bestTimes(availabilityIndex(event, people), 60);
    // 09:00, 10:00 and 11:00 on each day; never 09:30 next to 09:00.
    expect(results.map((w) => [w.date, w.startMinute])).toEqual([
      [MON, 540],
      [MON, 600],
      [MON, 660],
      [TUE, 540],
      [TUE, 600],
    ]);
  });

  it('respects the limit', () => {
    const people = [person(1, 'Ana', [MON, 540, 720], [TUE, 540, 720])];
    expect(bestTimes(availabilityIndex(event, people), 30, 2)).toHaveLength(2);
  });

  it('counts people with no slots as missing, and leaves out windows nobody can make', () => {
    const people = [person(1, 'Ana', [TUE, 600, 660]), person(2, 'Ben')];
    expect(bestTimes(availabilityIndex(event, people), 60)).toEqual([
      { date: TUE, startMinute: 600, endMinute: 660, free: ['Ana'], missing: ['Ben'] },
    ]);
  });

  it('returns nothing for lengths that are not a whole number of slots, or longer than a day', () => {
    const people = [person(1, 'Ana', [MON, 540, 720])];
    expect(bestTimes(availabilityIndex(event, people), 45)).toEqual([]);
    expect(bestTimes(availabilityIndex(event, people), 0)).toEqual([]);
    expect(bestTimes(availabilityIndex(event, people), 210)).toEqual([]);
    expect(bestTimes(availabilityIndex(event, people), 180)).toHaveLength(1); // exactly the whole window
  });

  it('returns nothing when no one has answered', () => {
    expect(bestTimes(availabilityIndex(event, []), 60)).toEqual([]);
  });

  it('stays fast at the largest event', () => {
    const big = {
      dates: Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`),
      startMinute: 0,
      endMinute: 1440,
      slotMinutes: 15,
    };
    // 150 people, each free for a different 4-hour block every day.
    const people = Array.from({ length: 150 }, (_, n) => ({
      id: n,
      name: `P${n}`,
      slots: big.dates.flatMap((date, i) => {
        const from = ((n + i) * 60) % 1200;
        return Array.from({ length: 16 }, (_, k) => slotKey(date, from + k * 15));
      }),
    }));
    // The index is built once per change of answers; each length is then just a ranking.
    const start = performance.now();
    const index = availabilityIndex(big, people);
    for (const length of [15, 30, 60, 90, 120, 240]) bestTimes(index, length);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
