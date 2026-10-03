import { useMemo, useState } from 'react';
import type { EventGrid, ParticipantResponse } from '@flexmeet/shared';
import { SlotGrid, cellFromElement } from './SlotGrid';

interface GroupGridProps {
  event: EventGrid;
  participants: ParticipantResponse[];
}

// Heatmap of how many people are free in each slot. Hover a cell to see who.
export function GroupGrid({ event, participants }: GroupGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);

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
  const free = hovered ? (freeBySlot.get(hovered) ?? []) : [];
  const busy = participants.map((p) => p.name).filter((name) => !free.includes(name));

  return (
    <>
      <SlotGrid
        event={event}
        cellStyle={(key) => {
          const count = freeBySlot.get(key)?.length ?? 0;
          if (count === 0) return undefined;
          return {
            background: `color-mix(in srgb, var(--primary) ${(count / total) * 100}%, var(--bg))`,
          };
        }}
        cellClassName={(key) => (key === hovered ? 'hovered' : '')}
        onPointerOver={(e) => setHovered(cellFromElement(e.target as Element)?.key ?? null)}
        onPointerLeave={() => setHovered(null)}
      />
      <div className="group-summary">
        {total === 0 ? (
          <p className="muted">No one has added their availability yet.</p>
        ) : hovered ? (
          <>
            <p>
              <strong>
                Free ({free.length}/{total}):
              </strong>{' '}
              {free.join(', ') || 'no one'}
            </p>
            {busy.length > 0 && <p className="muted">Unavailable: {busy.join(', ')}</p>}
          </>
        ) : (
          <p className="muted">Hover a cell to see who's free.</p>
        )}
      </div>
    </>
  );
}
