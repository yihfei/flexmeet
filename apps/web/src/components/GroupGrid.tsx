import { Fragment, useMemo, useState } from 'react';
import type { EventGrid, ParticipantResponse } from '@flexmeet/shared';
import { SlotGrid, cellFromElement } from './SlotGrid';

interface GroupGridProps {
  event: EventGrid;
  participants: ParticipantResponse[];
}

// Shade for a slot where `count` people are free, relative to the best slot (`max`), so
// the best time is always full colour even when turnout is low. Starts at 15% rather than
// 0% so a single free person is still visible against an empty cell.
function heatColor(count: number, max: number): string {
  const percent = 15 + (count / max) * 85;
  return `color-mix(in srgb, var(--primary) ${percent}%, var(--bg))`;
}

// Heatmap of how many people are free in each slot. Hover a cell to see who, or tap/click
// it to keep it selected (touch screens have no hover).
export function GroupGrid({ event, participants }: GroupGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hovered ?? pinned;

  // slot key -> names of people free then
  const freeBySlot = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of participants) {
      for (const slot of p.slots) {
        map.set(slot, [...(map.get(slot) ?? []), p.name]);
      }
    }
    return map;
  }, [participants]);

  const total = participants.length;
  const max = Math.max(0, ...[...freeBySlot.values()].map((names) => names.length));
  const free = active ? (freeBySlot.get(active) ?? []) : [];
  const busy = participants.map((p) => p.name).filter((name) => !free.includes(name));

  return (
    <>
      {/* Same rows as AvailabilityGrid (meta, then grid) so the two grids line up side by side. */}
      <div className="grid-meta">{max > 0 && <HeatLegend max={max} total={total} />}</div>
      <SlotGrid
        event={event}
        cellStyle={(key) => {
          const count = freeBySlot.get(key)?.length ?? 0;
          if (count === 0) return undefined;
          return { background: heatColor(count, max) };
        }}
        cellClassName={(key) => (key === active ? 'hovered' : '')}
        onPointerOver={(e) => setHovered(cellFromElement(e.target as Element)?.key ?? null)}
        onPointerLeave={() => setHovered(null)}
        onClick={(e) => {
          const key = cellFromElement(e.target as Element)?.key;
          if (key) setPinned((prev) => (prev === key ? null : key));
        }}
      />
      <div className="group-summary">
        {total === 0 ? (
          <p className="muted">No one has added their availability yet.</p>
        ) : active ? (
          <>
            <p>
              <strong>
                Free ({free.length}/{total}):
              </strong>{' '}
              {free.length > 0 ? <NameList names={free} /> : 'no one'}
            </p>
            {busy.length > 0 && (
              <p className="muted">
                Unavailable: <NameList names={busy} />
              </p>
            )}
          </>
        ) : (
          <p className="muted">Hover or tap a cell to see who's free.</p>
        )}
      </div>
    </>
  );
}

// "Ana, Ben, Chi +12 more". <bdi> keeps the commas in place around right-to-left names.
function NameList({ names, limit = 8 }: { names: string[]; limit?: number }) {
  return (
    <>
      {names.slice(0, limit).map((name, i) => (
        <Fragment key={name}>
          {i > 0 && ', '}
          <bdi>{name}</bdi>
        </Fragment>
      ))}
      {names.length > limit && ` +${names.length - limit} more`}
    </>
  );
}

// One swatch per possible count, from 0 free to the best slot.
function HeatLegend({ max, total }: { max: number; total: number }) {
  return (
    <div className="heat-legend">
      <span>0/{total} free</span>
      <div className="heat-legend-swatches" aria-hidden="true">
        {Array.from({ length: max + 1 }, (_, count) => (
          <span
            key={count}
            style={{ background: count === 0 ? 'var(--bg)' : heatColor(count, max) }}
          />
        ))}
      </div>
      <span>
        {max}/{total} free
      </span>
    </div>
  );
}
