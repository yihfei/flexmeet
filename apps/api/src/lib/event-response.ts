import type { EventResponse } from '@flexmeet/shared';
import type { Event } from '../generated/prisma/client.js';

// @db.Date values come back as UTC midnight, so the UTC date part is the stored day.
const toYmd = (date: Date) => date.toISOString().slice(0, 10);

// Lists fields explicitly so new columns stay private until added here.
export function toEventResponse(event: Event): EventResponse {
  return {
    slug: event.slug,
    title: event.title,
    dates: event.dates.map(toYmd),
    startMinute: event.startMinute,
    endMinute: event.endMinute,
    slotMinutes: event.slotMinutes,
    durationMinutes: event.durationMinutes,
    timezone: event.timezone,
    createdAt: event.createdAt.toISOString(),
  };
}
