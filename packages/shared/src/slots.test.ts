import { describe, expect, it } from 'vitest';
import { allSlotKeys, slotKey, slotStartMinutes } from './slots.js';

const event = {
  dates: ['2026-10-10', '2026-10-11'],
  startMinute: 540,
  endMinute: 660,
  slotMinutes: 30,
};

describe('slotKey', () => {
  it('pads hours and minutes', () => {
    expect(slotKey('2026-10-10', 545)).toBe('2026-10-10T09:05');
    expect(slotKey('2026-10-10', 0)).toBe('2026-10-10T00:00');
  });
});

describe('slotStartMinutes', () => {
  it('excludes the end minute', () => {
    expect(slotStartMinutes(event)).toEqual([540, 570, 600, 630]);
  });
});

describe('allSlotKeys', () => {
  it('has one key per date and row', () => {
    const keys = allSlotKeys(event);
    expect(keys.size).toBe(8);
    expect(keys.has('2026-10-11T10:30')).toBe(true);
    expect(keys.has('2026-10-10T11:00')).toBe(false);
  });
});
