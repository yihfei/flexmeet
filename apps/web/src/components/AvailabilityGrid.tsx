import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { slotStartMinutes, type EventGrid } from '@flexmeet/shared';
import { applySelection, sameCell, slotsInRect, type Cell, type PaintMode } from '../lib/grid';
import { useCoarsePointer } from '../lib/useCoarsePointer';
import { useHoldToDrag } from '../lib/useHoldToDrag';
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
  hint?: ReactNode; // shown above the grid
}

// Drag a rectangle to mark slots. Starting on an empty cell adds, starting on a
// marked cell removes (the same as when2meet). Changes are reported on release.
// With a mouse, dragging starts straight away. On touch screens a swipe scrolls, a tap toggles
// one slot, and resting the finger for a moment (a haptic tick) starts the drag.
export function AvailabilityGrid({ event, selected, onChange, hint }: AvailabilityGridProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const touch = useCoarsePointer();
  const gridRef = useRef<HTMLDivElement>(null);

  function startDrag(target: Element | null): boolean {
    const hit = cellFromElement(target);
    if (!hit) return false;
    setDrag({ start: hit.cell, current: hit.cell, mode: selected.has(hit.key) ? 'remove' : 'add' });
    return true;
  }

  useHoldToDrag(gridRef, {
    enabled: touch,
    onHoldStart: startDrag,
    onTap: (target) => {
      const hit = cellFromElement(target);
      if (!hit) return;
      onChange(applySelection(selected, [hit.key], selected.has(hit.key) ? 'remove' : 'add'));
    },
  });

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
    if (e.pointerType === 'touch') return; // touch goes through useHoldToDrag
    if (!startDrag(e.target as Element)) return;
    e.preventDefault(); // stops text selection while dragging
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    // elementFromPoint rather than e.target: on touch screens the browser keeps sending
    // events to the cell where the finger first landed.
    const hit = cellFromElement(document.elementFromPoint(e.clientX, e.clientY));
    if (hit && !sameCell(hit.cell, drag.current)) setDrag({ ...drag, current: hit.cell });
  }

  return (
    <>
      {/* Same rows as GroupGrid (meta, then grid) so the two grids line up side by side. */}
      <div className="grid-meta">{hint}</div>
      <SlotGrid
        ref={gridRef}
        event={event}
        className="editable"
        cellClassName={(key) => (shown.has(key) ? 'selected' : '')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </>
  );
}
