import { describe, expect, it } from 'vitest';
import { applySelection, slotsInRect } from './grid';

const dates = ['2026-10-10', '2026-10-11', '2026-10-12'];
const minutes = [540, 570, 600];

describe('slotsInRect', () => {
  it('covers every cell between two corners', () => {
    const keys = slotsInRect(
      dates,
      minutes,
      { dateIndex: 0, minuteIndex: 1 },
      { dateIndex: 1, minuteIndex: 2 },
    );
    expect(keys).toEqual([
      '2026-10-10T09:30',
      '2026-10-10T10:00',
      '2026-10-11T09:30',
      '2026-10-11T10:00',
    ]);
  });

  it('works when dragging up and to the left', () => {
    const a = { dateIndex: 2, minuteIndex: 2 };
    const b = { dateIndex: 1, minuteIndex: 1 };
    expect(slotsInRect(dates, minutes, a, b)).toEqual(slotsInRect(dates, minutes, b, a));
  });

  it('is a single cell when both corners match', () => {
    const cell = { dateIndex: 1, minuteIndex: 0 };
    expect(slotsInRect(dates, minutes, cell, cell)).toEqual(['2026-10-11T09:00']);
  });
});

describe('applySelection', () => {
  const selected = new Set(['a', 'b']);

  it('adds keys', () => {
    expect([...applySelection(selected, ['b', 'c'], 'add')].sort()).toEqual(['a', 'b', 'c']);
  });

  it('removes keys', () => {
    expect([...applySelection(selected, ['b', 'c'], 'remove')]).toEqual(['a']);
  });

  it('does not mutate the input', () => {
    applySelection(selected, ['c'], 'add');
    expect([...selected]).toEqual(['a', 'b']);
  });
});
