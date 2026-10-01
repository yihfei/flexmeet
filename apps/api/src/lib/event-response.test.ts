import { describe, expect, it } from 'vitest';
import { toEventResponse } from './event-response.js';

const row = {
  id: 42,
  slug: 'kX3f9_aQ2bM',
  title: 'Team lunch',
  dates: [new Date('2026-10-03'), new Date('2026-10-05')],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  durationMinutes: null,
  timezone: 'Asia/Singapore',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

describe('toEventResponse', () => {
  it('formats dates as YYYY-MM-DD', () => {
    expect(toEventResponse(row).dates).toEqual(['2026-10-03', '2026-10-05']);
  });

  it('does not expose internal fields', () => {
    const response = toEventResponse(row);
    expect(response).not.toHaveProperty('id');
    expect(response).not.toHaveProperty('updatedAt');
  });

  it('keeps a missing duration as null', () => {
    expect(toEventResponse(row).durationMinutes).toBeNull();
  });
});
