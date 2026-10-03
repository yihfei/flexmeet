import {
  useEffect,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from 'react';
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
  hint?: ReactNode; // shown above the grid, beside the touch mode switch
}

// True on touch screens. There a drag can't both scroll and mark, so the user picks.
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(pointer: coarse)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(pointer: coarse)').matches,
  );
}

// Drag a rectangle to mark slots. Starting on an empty cell adds, starting on a
// marked cell removes (the same as when2meet). Changes are reported on release.
export function AvailabilityGrid({ event, selected, onChange, hint }: AvailabilityGridProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const touch = useCoarsePointer();
  // Touch starts in scroll mode so a big grid never traps the page.
  const [marking, setMarking] = useState(false);
  const canMark = !touch || marking;

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
    if (!canMark) return;
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
    <>
      {/* Same rows as GroupGrid (meta, then grid) so the two grids line up side by side. */}
      <div className="grid-meta">
        {hint}
        {touch && (
          <div className="mode-switch" role="group" aria-label="What dragging does">
            <button type="button" aria-pressed={!marking} onClick={() => setMarking(false)}>
              Scroll
            </button>
            <button type="button" aria-pressed={marking} onClick={() => setMarking(true)}>
              Mark slots
            </button>
          </div>
        )}
      </div>
      <SlotGrid
        event={event}
        className={canMark ? 'editable' : ''}
        cellClassName={(key) => (shown.has(key) ? 'selected' : '')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </>
  );
}
