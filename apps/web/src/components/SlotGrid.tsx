import { Fragment, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { slotKey, slotStartMinutes, type EventGrid } from '@flexmeet/shared';
import type { Cell } from '../lib/grid';
import { formatYmdParts, minutesToTime } from '../lib/time';

interface SlotGridProps extends HTMLAttributes<HTMLDivElement> {
  event: EventGrid;
  cellClassName?: (key: string) => string;
  cellStyle?: (key: string) => CSSProperties | undefined;
  ref?: Ref<HTMLDivElement>; // the grid itself (inside its scroll box)
}

// The dates × times layout shared by the editable grid and the group grid. The parent
// handles interaction through the container's event handlers (passed in via ...rest).
export function SlotGrid({
  event,
  cellClassName,
  cellStyle,
  className,
  ref,
  ...rest
}: SlotGridProps) {
  const minutes = slotStartMinutes(event);

  return (
    <div className="slot-grid-scroll">
      <div
        ref={ref}
        className={`slot-grid ${className ?? ''}`}
        style={{ '--cols': event.dates.length } as CSSProperties}
        {...rest}
      >
        <div className="slot-grid-corner" />
        {event.dates.map((date) => {
          const { weekday, dayMonth } = formatYmdParts(date);
          return (
            <div key={date} className="slot-grid-date">
              <span>{weekday}</span>
              <span>{dayMonth}</span>
            </div>
          );
        })}

        {minutes.map((minute, minuteIndex) => (
          <Fragment key={minute}>
            <div className="slot-grid-time">
              {/* Hours only, plus the first row so a grid that starts at :30 still has a label. */}
              {(minuteIndex === 0 || minute % 60 === 0) && <span>{minutesToTime(minute)}</span>}
            </div>
            {event.dates.map((date, dateIndex) => {
              const key = slotKey(date, minute);
              // Solid line where the next hour starts, so rows line up with the hour labels.
              const endsOnHour = (minute + event.slotMinutes) % 60 === 0;
              return (
                <div
                  key={key}
                  className={`slot ${endsOnHour ? 'hour-end' : ''} ${cellClassName?.(key) ?? ''}`}
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
