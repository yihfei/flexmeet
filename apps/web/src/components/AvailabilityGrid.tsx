import { useEffect, useState, type PointerEvent } from 'react';
import { slotStartMinutes, type EventGrid } from '@flexmeet/shared';
import { applySelection, sameCell, slotsInRect, type Cell, type PaintMode } from '../lib/grid';
import { SlotGrid, cellFromElement } from './SlotGrid';

interface Drag {
  start: Cell;
  current: Cell;
  mode: PaintMode;
}

interface AvailabilityGridProps {
  event: EventGrid;
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

// Drag a rectangle to mark slots. Starting on an empty cell adds, starting on a
// marked cell removes (the same as when2meet). Changes are reported on release.
export function AvailabilityGrid({ event, selected, onChange }: AvailabilityGridProps) {
  const [drag, setDrag] = useState<Drag | null>(null);

  // While dragging, preview the result without touching `selected`.
  const shown = drag
    ? applySelection(
        selected,
        slotsInRect(event.dates, slotStartMinutes(event), drag.start, drag.current),
        drag.mode,
      )
    : selected;

  // Releasing anywhere on the page ends the drag, even outside the grid.
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      onChange(new Set(shown));
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [drag, shown, onChange]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const hit = cellFromElement(e.target as Element);
    if (!hit) return;
    e.preventDefault(); // stops text selection while dragging
    setDrag({ start: hit.cell, current: hit.cell, mode: selected.has(hit.key) ? 'remove' : 'add' });
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    // elementFromPoint rather than e.target: on touch screens the browser keeps sending
    // events to the cell where the finger first landed.
    const hit = cellFromElement(document.elementFromPoint(e.clientX, e.clientY));
    if (hit && !sameCell(hit.cell, drag.current)) setDrag({ ...drag, current: hit.cell });
  }

  return (
    <SlotGrid
      event={event}
      className="editable"
      cellClassName={(key) => (shown.has(key) ? 'selected' : '')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  );
}
