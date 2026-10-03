import { slotKey } from '@flexmeet/shared';

// A cell's position in the grid: which date column and which time row.
export interface Cell {
  dateIndex: number;
  minuteIndex: number;
}

export type PaintMode = 'add' | 'remove';

// Slot keys of every cell in the rectangle between two corners (inclusive, any order).
export function slotsInRect(dates: string[], minutes: number[], a: Cell, b: Cell): string[] {
  const keys: string[] = [];
  const [d0, d1] = [Math.min(a.dateIndex, b.dateIndex), Math.max(a.dateIndex, b.dateIndex)];
  const [m0, m1] = [Math.min(a.minuteIndex, b.minuteIndex), Math.max(a.minuteIndex, b.minuteIndex)];
  for (let d = d0; d <= d1; d++) {
    for (let m = m0; m <= m1; m++) {
      const date = dates[d];
      const minute = minutes[m];
      if (date !== undefined && minute !== undefined) keys.push(slotKey(date, minute));
    }
  }
  return keys;
}

// Returns a new set with the keys added or removed. Never mutates `selected`.
export function applySelection(
  selected: ReadonlySet<string>,
  keys: string[],
  mode: PaintMode,
): Set<string> {
  const next = new Set(selected);
  for (const key of keys) {
    if (mode === 'add') next.add(key);
    else next.delete(key);
  }
  return next;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.dateIndex === b.dateIndex && a.minuteIndex === b.minuteIndex;
}
