import { describe, expect, it } from 'vitest';
import {
  addDays,
  applyDays,
  dayOfWeek,
  daysBetween,
  groupMode,
  monthDaysOn,
  monthWeeks,
  workdaysOf,
} from './calendar';

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is not shifted by daylight saving changes', () => {
    // Europe and the US change clocks in late March and early November.
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });
});

describe('monthWeeks', () => {
  it('fills whole weeks starting on Monday', () => {
    const weeks = monthWeeks(2026, 9, 1); // October 2026 starts on a Thursday
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks).toHaveLength(5);
    expect(weeks.at(-1)?.at(-1)).toBe('2026-11-01');
    expect(weeks.flat().every((day, i, all) => i === 0 || day === addDays(all[i - 1]!, 1))).toBe(
      true,
    );
  });

  it('starts weeks on Sunday when asked', () => {
    const weeks = monthWeeks(2026, 9, 0);
    expect(weeks[0]?.[0]).toBe('2026-09-27');
    expect(weeks.every((week) => dayOfWeek(week[0]!) === 0)).toBe(true);
  });

  it('adds a sixth row when the month needs one', () => {
    expect(monthWeeks(2026, 7, 1)).toHaveLength(6); // August 2026: Sat 1st to Mon 31st
  });
});

describe('daysBetween', () => {
  it('includes both ends, in either order', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(daysBetween('2026-11-02', '2026-10-30')).toHaveLength(4);
    expect(daysBetween('2026-10-12', '2026-10-12')).toEqual(['2026-10-12']);
  });
});

describe('workdaysOf', () => {
  it('keeps Monday to Friday of a Sunday-first week', () => {
    const week = monthWeeks(2026, 9, 0)[2]!; // Sun 11 Oct to Sat 17 Oct
    expect(workdaysOf(week)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });
});

describe('monthDaysOn', () => {
  it('lists every Wednesday of the month', () => {
    expect(monthDaysOn(2026, 9, 3)).toEqual([
      '2026-10-07',
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ]);
  });
});

describe('groupMode', () => {
  it('removes a fully selected group and adds a partly selected one', () => {
    const group = ['2026-10-12', '2026-10-13'];
    expect(groupMode(new Set(group), group)).toBe('remove');
    expect(groupMode(new Set(['2026-10-12']), group)).toBe('add');
    expect(groupMode(new Set(), [])).toBe('add');
  });
});

describe('applyDays', () => {
  it('adds, removes and sorts', () => {
    const selected = new Set(['2026-10-20']);
    expect(applyDays(selected, ['2026-10-13', '2026-10-12'], 'add', 31).dates).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-20',
    ]);
    expect(applyDays(selected, ['2026-10-20'], 'remove', 31).dates).toEqual([]);
  });

  it('stops at the limit, keeping the earliest days', () => {
    const result = applyDays(
      new Set(['2026-10-01']),
      daysBetween('2026-10-10', '2026-10-14'),
      'add',
      3,
    );
    expect(result).toEqual({ dates: ['2026-10-01', '2026-10-10', '2026-10-11'], hitLimit: true });
  });

  it('does not count days that are already selected towards the limit', () => {
    const result = applyDays(new Set(['2026-10-10']), ['2026-10-10', '2026-10-11'], 'add', 2);
    expect(result).toEqual({ dates: ['2026-10-10', '2026-10-11'], hitLimit: false });
  });
});
