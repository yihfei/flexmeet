import { describe, expect, it } from 'vitest';
import { checkSlotsForEvent } from './validate-slots.js';

const event = {
  id: 1,
  slug: 'kX3f9_aQ2bM',
  title: 'Team lunch',
  dates: [new Date('2026-10-03')],
  startMinute: 540,
  endMinute: 600,
  slotMinutes: 15,
  durationMinutes: null,
  timezone: 'Asia/Singapore',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

describe('checkSlotsForEvent', () => {
  it('accepts grid cells and returns them sorted and unique', () => {
    expect(
      checkSlotsForEvent(event, ['2026-10-03T09:45', '2026-10-03T09:00', '2026-10-03T09:00']),
    ).toEqual({
      ok: true,
      slots: ['2026-10-03T09:00', '2026-10-03T09:45'],
    });
  });

  it('rejects the end minute, off-boundary times and other dates', () => {
    expect(
      checkSlotsForEvent(event, ['2026-10-03T10:00', '2026-10-03T09:10', '2026-10-04T09:00']),
    ).toEqual({ ok: false, invalid: ['2026-10-03T10:00', '2026-10-03T09:10', '2026-10-04T09:00'] });
  });

  it('accepts an empty list', () => {
    expect(checkSlotsForEvent(event, [])).toEqual({ ok: true, slots: [] });
  });
});
