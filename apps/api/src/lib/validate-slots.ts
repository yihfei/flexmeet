import { allSlotKeys } from '@flexmeet/shared';
import type { Event } from '../generated/prisma/client.js';
import { toEventResponse } from './event-response.js';

type SlotCheck = { ok: true; slots: string[] } | { ok: false; invalid: string[] };

// Checks every slot is a cell on this event's grid, and returns them de-duplicated and sorted.
export function checkSlotsForEvent(event: Event, slots: string[]): SlotCheck {
  const valid = allSlotKeys(toEventResponse(event));
  const invalid = slots.filter((slot) => !valid.has(slot));
  if (invalid.length > 0) return { ok: false, invalid };
  // Keys are 'YYYY-MM-DDTHH:mm', so string order is time order.
  return { ok: true, slots: [...new Set(slots)].sort() };
}
