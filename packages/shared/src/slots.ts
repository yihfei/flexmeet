import type { EventResponse } from './event.js';

// The fields that decide which cells an event's grid has.
export type EventGrid = Pick<EventResponse, 'dates' | 'startMinute' | 'endMinute' | 'slotMinutes'>;

// Slot keys name one cell of the grid in the event's own timezone: 'YYYY-MM-DDTHH:mm'.
export const SLOT_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function slotKey(date: string, minute: number): string {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${date}T${h}:${m}`;
}

// Start minute of every row: 540, 570, ... up to (not including) endMinute.
export function slotStartMinutes(event: EventGrid): number[] {
  const minutes: number[] = [];
  for (let m = event.startMinute; m < event.endMinute; m += event.slotMinutes) {
    minutes.push(m);
  }
  return minutes;
}

export function allSlotKeys(event: EventGrid): Set<string> {
  const minutes = slotStartMinutes(event);
  return new Set(event.dates.flatMap((date) => minutes.map((m) => slotKey(date, m))));
}
