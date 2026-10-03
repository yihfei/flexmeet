import { z } from 'zod';
import type { ParticipantResponse } from './participant.js';

const MINUTES_PER_DAY = 24 * 60;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(100, 'Keep the title to 100 characters or fewer'),
    dates: z
      .array(z.iso.date('Pick a valid date'))
      .min(1, 'Pick at least one date')
      .max(31, 'Pick at most 31 dates')
      .refine((dates) => new Set(dates).size === dates.length, 'Dates must be unique'),
    startMinute: z.int('Pick a start time').min(0).max(MINUTES_PER_DAY),
    endMinute: z.int('Pick an end time').min(0).max(MINUTES_PER_DAY),
    slotMinutes: z.literal([15, 30], 'Slot size must be 15 or 30 minutes'),
    durationMinutes: z.int().positive('Meeting length must be positive').optional(),
    timezone: z.string().refine(isValidTimeZone, 'Unknown timezone'),
  })
  .superRefine((event, ctx) => {
    const { startMinute, endMinute, slotMinutes, durationMinutes } = event;

    if (endMinute <= startMinute) {
      ctx.addIssue({ code: 'custom', path: ['endMinute'], message: 'End must be after start' });
    }
    if (startMinute % slotMinutes !== 0) {
      ctx.addIssue({ code: 'custom', path: ['startMinute'], message: `Start must be on a ${slotMinutes}-minute boundary` });
    }
    if (endMinute % slotMinutes !== 0) {
      ctx.addIssue({ code: 'custom', path: ['endMinute'], message: `End must be on a ${slotMinutes}-minute boundary` });
    }
    if (durationMinutes !== undefined) {
      if (durationMinutes % slotMinutes !== 0) {
        ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: `Duration must be a multiple of ${slotMinutes} minutes` });
      }
      if (durationMinutes > endMinute - startMinute) {
        ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Duration is longer than the daily time window' });
      }
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

export interface EventResponse {
  slug: string;
  title: string;
  dates: string[]; // 'YYYY-MM-DD'
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
  durationMinutes: number | null;
  timezone: string;
  createdAt: string; // ISO timestamp
  participants: ParticipantResponse[];
}
