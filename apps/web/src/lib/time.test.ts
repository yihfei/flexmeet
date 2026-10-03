import { describe, expect, it } from 'vitest';
import { minutesToTime, timeToMinutes, todayYmd } from './time';

describe('timeToMinutes', () => {
  it('converts HH:MM to minutes after midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:45')).toBe(1425);
  });

  it('returns NaN for anything else', () => {
    expect(timeToMinutes('')).toBeNaN();
    expect(timeToMinutes('9:30')).toBeNaN();
  });
});

describe('minutesToTime', () => {
  it('converts minutes back to HH:MM', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(1440)).toBe('24:00');
  });
});

describe('todayYmd', () => {
  it('uses the local calendar date', () => {
    expect(todayYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
