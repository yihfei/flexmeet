import { z } from 'zod';
import { SLOT_KEY_PATTERN } from './slots.js';

// 31 days of 15-minute slots across a whole day.
const MAX_SLOTS = 31 * 96;

export const joinEventSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
});

export type JoinEventInput = z.infer<typeof joinEventSchema>;

// Only checks the shape. Whether each slot is on the event's grid needs the event,
// so the API checks that separately.
export const updateAvailabilitySchema = z.object({
  slots: z.array(z.string().regex(SLOT_KEY_PATTERN, 'Invalid slot')).max(MAX_SLOTS),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export interface ParticipantResponse {
  id: number;
  name: string;
  slots: string[]; // slot keys, e.g. '2026-10-10T09:30'
}
