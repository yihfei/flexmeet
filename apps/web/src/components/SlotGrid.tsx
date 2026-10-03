import { Fragment, type CSSProperties, type HTMLAttributes } from 'react';
import { slotKey, slotStartMinutes, type EventGrid } from '@flexmeet/shared';
import type { Cell } from '../lib/grid';
import { formatYmd, minutesToTime } from '../lib/time';

interface SlotGridProps extends HTMLAttributes<HTMLDivElement> {
  event: EventGrid;
  cellClassName?: (key: string) => string;
  cellStyle?: (key: string) => CSSProperties | undefined;
}

// The dates × times layout shared by the editable grid and the group grid. The parent
// handles interaction through the container's event handlers (passed in via ...rest).
export function SlotGrid({ event, cellClassName, cellStyle, className, ...rest }: SlotGridProps) {
  const minutes = slotStartMinutes(event);

  return (
    <div className="slot-grid-scroll">
      <div
        className={`slot-grid ${className ?? ''}`}
        style={{ '--cols': event.dates.length } as CSSProperties}
        {...rest}
      >
        <div />
        {event.dates.map((date) => (
          <div key={date} className="slot-grid-date">
            {formatYmd(date)}
          </div>
        ))}

        {minutes.map((minute, minuteIndex) => (
          <Fragment key={minute}>
            <div className="slot-grid-time">{minute % 60 === 0 ? minutesToTime(minute) : ''}</div>
            {event.dates.map((date, dateIndex) => {
              const key = slotKey(date, minute);
              return (
                <div
                  key={key}
                  className={`slot ${cellClassName?.(key) ?? ''}`}
                  style={cellStyle?.(key)}
                  data-slot={key}
                  data-date-index={dateIndex}
                  data-minute-index={minuteIndex}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Finds the grid cell at (or containing) a DOM element, if there is one.
export function cellFromElement(el: Element | null): { key: string; cell: Cell } | null {
  const slot = el?.closest<HTMLElement>('[data-slot]');
  if (!slot?.dataset.slot) return null;
  return {
    key: slot.dataset.slot,
    cell: {
      dateIndex: Number(slot.dataset.dateIndex),
      minuteIndex: Number(slot.dataset.minuteIndex),
    },
  };
}
