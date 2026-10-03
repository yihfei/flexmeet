import { useMemo, useState } from 'react';
import {
  availabilityIndex,
  bestTimes,
  type EventResponse,
  type ParticipantResponse,
  type TimeWindow,
} from '@flexmeet/shared';
import { formatYmdParts, minutesToTime } from '../lib/time';
import type { GridHighlight } from './GroupGrid';
import { NameList } from './NameList';

type BestTimesEvent = Pick<
  EventResponse,
  'dates' | 'startMinute' | 'endMinute' | 'slotMinutes' | 'durationMinutes'
>;

interface BestTimesProps {
  event: BestTimesEvent;
  participants: ParticipantResponse[];
  highlight: GridHighlight | null;
  onHighlight: (window: GridHighlight | null) => void;
}

const BASE_LENGTHS = [30, 60, 90, 120];

// The lengths offered: whole numbers of slots that fit in the day, plus the event's own length.
function lengthOptions(event: BestTimesEvent): number[] {
  const window = event.endMinute - event.startMinute;
  const lengths = new Set([...(event.slotMinutes === 15 ? [15] : []), ...BASE_LENGTHS]);
  if (event.durationMinutes) lengths.add(event.durationMinutes);
  return [...lengths]
    .filter((m) => m % event.slotMinutes === 0 && m <= window)
    .sort((a, b) => a - b);
}

// 30 -> '30m', 60 -> '1h', 90 -> '1.5h'
function formatLength(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
}

function sameWindow(a: GridHighlight | null, b: TimeWindow): boolean {
  return !!a && a.date === b.date && a.startMinute === b.startMinute && a.endMinute === b.endMinute;
}

// The times the most people can make, for a meeting length you can change. Starts at the
// event's length if it has one, otherwise an hour. Clicking a suggestion frames it on the
// group heatmap.
export function BestTimes({ event, participants, highlight, onHighlight }: BestTimesProps) {
  const options = useMemo(() => lengthOptions(event), [event]);
  const [length, setLength] = useState(() => {
    const preferred = event.durationMinutes ?? 60;
    return options.includes(preferred) ? preferred : (options.at(-1) ?? event.slotMinutes);
  });

  // Who's free when, rebuilt only when answers change; switching length just re-ranks.
  const index = useMemo(() => availabilityIndex(event, participants), [event, participants]);
  const results = useMemo(() => bestTimes(index, length), [index, length]);
  const total = participants.length;

  // If nothing works for everyone, the longest shorter length that does.
  const everyoneAt = useMemo(() => {
    if (total === 0 || results[0]?.free.length === total) return null;
    return (
      options
        .filter((m) => m < length)
        .reverse()
        .find((m) => bestTimes(index, m, 1)[0]?.free.length === total) ?? null
    );
  }, [index, length, results, total, options]);

  function changeLength(next: number) {
    setLength(next);
    onHighlight(null); // the suggestions change, so the framed window would be stale
  }

  return (
    <section className="best-times" aria-labelledby="best-times-title">
      <div className="best-times-head">
        <h2 id="best-times-title">Best times</h2>
        {options.length > 1 && (
          <div className="mode-switch" role="group" aria-label="Meeting length">
            {options.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === length}
                onClick={() => changeLength(m)}
              >
                {formatLength(m)}
              </button>
            ))}
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="muted best-times-note">
          No one has added their availability yet. Suggestions appear here once people do.
        </p>
      ) : results.length === 0 ? (
        <p className="muted best-times-note">
          No {formatLength(length)} time works for anyone yet.
        </p>
      ) : (
        <ol className="best-times-list">
          {results.map((w) => {
            const { weekday, dayMonth } = formatYmdParts(w.date);
            const selected = sameWindow(highlight, w);
            return (
              <li key={`${w.date}-${w.startMinute}`}>
                <button
                  type="button"
                  className="best-time"
                  aria-pressed={selected}
                  onClick={() => onHighlight(selected ? null : w)}
                >
                  <span className="best-time-when">
                    <span className="best-time-date">
                      {weekday} {dayMonth}
                    </span>
                    <span className="best-time-range">
                      {minutesToTime(w.startMinute)}–{minutesToTime(w.endMinute)}
                    </span>
                  </span>
                  <span className="best-time-count">
                    {w.free.length === total
                      ? `All ${total} free`
                      : `${w.free.length} of ${total} free`}
                  </span>
                  <span className="best-time-bar" aria-hidden="true">
                    <span style={{ width: `${(w.free.length / total) * 100}%` }} />
                  </span>
                  <span className="best-time-missing">
                    {w.missing.length > 0 ? (
                      <>
                        Missing: <NameList names={w.missing} limit={3} />
                      </>
                    ) : (
                      'Everyone can make it'
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {everyoneAt !== null && (
        <p className="muted best-times-note">
          No {formatLength(length)} time works for all {total}. Everyone can make a{' '}
          {formatLength(everyoneAt)} meeting.{' '}
          <button type="button" className="link-button" onClick={() => changeLength(everyoneAt)}>
            Show {formatLength(everyoneAt)}
          </button>
        </p>
      )}
    </section>
  );
}
