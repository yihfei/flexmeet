import { describe, expect, it } from 'vitest';
import { createEventSchema } from '@flexmeet/shared';

const valid = {
  title: 'Team lunch',
  dates: ['2026-10-03', '2026-10-05'],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  durationMinutes: 90,
  timezone: 'Asia/Singapore',
};

describe('createEventSchema', () => {
  it('accepts a valid event', () => {
    expect(createEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an end before the start', () => {
    const result = createEventSchema.safeParse({ ...valid, startMinute: 600, endMinute: 540 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['endMinute']);
  });

  it('rejects a duration that is not a multiple of the slot size', () => {
    const result = createEventSchema.safeParse({ ...valid, durationMinutes: 45 });
    expect(result.success).toBe(false);
  });
});