import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  addDays,
  applyDays,
  dayOfWeek,
  daysBetween,
  groupMode,
  localeWeekStart,
  monthDaysOn,
  monthWeeks,
  workdaysOf,
} from '../lib/calendar';
import type { PaintMode } from '../lib/grid';
import { todayYmd } from '../lib/time';
import { useCoarsePointer } from '../lib/useCoarsePointer';
import { useHoldToDrag } from '../lib/useHoldToDrag';

interface DatePickerProps {
  value: string[]; // sorted 'YYYY-MM-DD'
  onChange: (dates: string[]) => void;
  max: number;
}

interface Drag {
  anchor: string;
  current: string;
  mode: PaintMode;
  touch?: boolean; // started by a held finger rather than a mouse
}

const weekStartsOn = localeWeekStart(navigator.language);

// The dates are UTC-based strings, so format them in UTC to keep the same calendar day.
const formatters = {
  month: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  narrowDay: new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }),
  longDay: new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' }),
  full: new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }),
  short: new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
};
const format = (formatter: Intl.DateTimeFormat, ymd: string) =>
  formatter.format(new Date(`${ymd}T00:00:00Z`));

const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

// A month calendar for picking an event's dates. Click a day to toggle it, drag across days
// to select a run of them, use a row's "M–F" to fill that week's workdays, or a weekday
// letter to fill that weekday all month. On touch screens a swipe scrolls the page, a tap
// toggles, and resting the finger for a moment (a haptic tick) starts the drag. Past days
// can't be picked.
export function DatePicker({ value, onChange, max }: DatePickerProps) {
  const today = todayYmd();
  const selected = new Set(value);
  const [view, setView] = useState(() => {
    const start = value[0] && value[0] > today ? value[0] : today;
    return { year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 };
  });
  const [drag, setDragState] = useState<Drag | null>(null);
  // The live drag, for the pointerup listener: a release in the same frame as the last
  // pointerenter would otherwise still see the previous render's drag and drop the range.
  const dragRef = useRef<Drag | null>(null);
  function setDrag(next: Drag | null) {
    dragRef.current = next;
    setDragState(next);
  }
  const [hitLimit, setHitLimit] = useState(false);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false); // only steal focus after an arrow key, never on render
  const touch = useCoarsePointer();
  // After a touch drag, the browser may still send a click to the day it started on.
  const ignoreClicksUntil = useRef(0);

  const weeks = monthWeeks(view.year, view.month, weekStartsOn);
  const visible = weeks.flat();
  const selectable = (day: string) => day >= today;

  // While dragging, preview the result without touching `value`.
  const shown = drag
    ? new Set(
        applyDays(
          selected,
          daysBetween(drag.anchor, drag.current).filter(selectable),
          drag.mode,
          max,
        ).dates,
      )
    : selected;

  function commit(days: string[], mode: PaintMode) {
    const result = applyDays(selected, days.filter(selectable), mode, max);
    setHitLimit(result.hitLimit);
    onChange(result.dates);
  }

  // Releasing anywhere ends a drag. A mouse drag that came back to where it started is a
  // click, which the day's onClick handles; a touch hold that never moved toggles that day.
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      const latest = dragRef.current;
      if (latest && latest.anchor !== latest.current) {
        commit(daysBetween(latest.anchor, latest.current), latest.mode);
      } else if (latest?.touch) {
        commit([latest.anchor], latest.mode);
      }
      if (latest?.touch) ignoreClicksUntil.current = performance.now() + 600;
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
  });

  useEffect(() => {
    if (!moveFocus.current || !focusDay) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, view]);

  function handleDayPointerDown(e: PointerEvent<HTMLButtonElement>, day: string) {
    if (e.pointerType === 'touch' || e.button !== 0 || !selectable(day)) return;
    setDrag({ anchor: day, current: day, mode: selected.has(day) ? 'remove' : 'add' });
  }

  const dayOf = (el: Element | null) => el?.closest<HTMLElement>('[data-day]')?.dataset.day;

  // Touch: taps stay ordinary clicks; a held finger drags across days.
  useHoldToDrag(gridRef, {
    enabled: touch,
    onHoldStart: (target) => {
      const day = dayOf(target);
      if (!day || !selectable(day)) return false;
      setDrag({
        anchor: day,
        current: day,
        mode: selected.has(day) ? 'remove' : 'add',
        touch: true,
      });
      return true;
    },
    onHoldMove: (under) => {
      const day = dayOf(under);
      const latest = dragRef.current;
      if (latest && day && selectable(day) && day !== latest.current) {
        setDrag({ ...latest, current: day });
      }
    },
  });

  function handleDayKeyDown(e: KeyboardEvent<HTMLButtonElement>, day: string) {
    const step = ARROW_STEPS[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = addDays(day, step);
    if (!selectable(next)) return;
    if (!visible.includes(next)) {
      setView({ year: Number(next.slice(0, 4)), month: Number(next.slice(5, 7)) - 1 });
    }
    moveFocus.current = true;
    setFocusDay(next);
  }

  function changeMonth(delta: number) {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  const monthStart = `${view.year}-${String(view.month + 1).padStart(2, '0')}-01`;
  const canGoBack = monthStart > today;
  // One day in the grid is the tab stop; arrow keys move between the rest.
  const tabStop =
    (focusDay && visible.includes(focusDay) && selectable(focusDay) && focusDay) ||
    visible.find((day) => selected.has(day) && selectable(day)) ||
    (visible.includes(today) ? today : visible.find(selectable));

  return (
    <div className="cal">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => changeMonth(-1)}
        >
          ‹
        </button>
        <span className="cal-title" aria-live="polite">
          {format(formatters.month, monthStart)}
        </span>
        <button
          type="button"
          className="cal-nav"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="cal-grid" ref={gridRef}>
        <span aria-hidden="true" />
        {weeks[0]!.map((day) => {
          const days = monthDaysOn(view.year, view.month, dayOfWeek(day)).filter(selectable);
          const all = groupMode(selected, days) === 'remove';
          return (
            <button
              key={day}
              type="button"
              className="cal-dow"
              aria-label={`${all ? 'Clear' : 'Select'} every ${format(formatters.longDay, day)}`}
              aria-pressed={all}
              disabled={days.length === 0}
              onClick={() => commit(days, groupMode(selected, days))}
            >
              {format(formatters.narrowDay, day)}
            </button>
          );
        })}

        {weeks.map((week) => {
          const workdays = workdaysOf(week).filter(selectable);
          const all = groupMode(selected, workdays) === 'remove';
          return [
            <button
              key={`week-${week[0]}`}
              type="button"
              className="cal-week"
              aria-label={`${all ? 'Clear' : 'Select'} Monday to Friday, week of ${format(formatters.short, week[0]!)}`}
              aria-pressed={all}
              disabled={workdays.length === 0}
              onClick={() => commit(workdays, groupMode(selected, workdays))}
            >
              M–F
            </button>,
            ...week.map((day) => (
              <button
                key={day}
                type="button"
                data-day={day}
                className={[
                  'cal-day',
                  day.slice(5, 7) === monthStart.slice(5, 7) ? '' : 'cal-day-outside',
                  day === today ? 'cal-day-today' : '',
                ].join(' ')}
                aria-label={format(formatters.full, day)}
                aria-pressed={shown.has(day)}
                aria-current={day === today ? 'date' : undefined}
                disabled={!selectable(day)}
                tabIndex={day === tabStop ? 0 : -1}
                onPointerDown={(e) => handleDayPointerDown(e, day)}
                onPointerEnter={() => {
                  const latest = dragRef.current;
                  if (latest && selectable(day) && day !== latest.current) {
                    setDrag({ ...latest, current: day });
                  }
                }}
                onClick={() => {
                  if (performance.now() < ignoreClicksUntil.current) return;
                  commit([day], selected.has(day) ? 'remove' : 'add');
                  setFocusDay(day);
                }}
                onKeyDown={(e) => handleDayKeyDown(e, day)}
              >
                {Number(day.slice(8))}
              </button>
            )),
          ];
        })}
      </div>

      <p className="cal-summary" role="status">
        {value.length === 0 ? (
          <span className="muted">
            {touch
              ? 'Tap a day, or hold and drag across days.'
              : 'Click a day, or drag across days, to pick dates.'}
          </span>
        ) : (
          <>
            <span>
              {value.length} {value.length === 1 ? 'date' : 'dates'}
              <span className="muted">
                {' · '}
                {format(formatters.short, value[0]!)}
                {value.length > 1 && ` – ${format(formatters.short, value.at(-1)!)}`}
              </span>
            </span>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                onChange([]);
                setHitLimit(false);
              }}
            >
              Clear
            </button>
          </>
        )}
      </p>
      {hitLimit && <p className="error">You can pick up to {max} dates.</p>}
    </div>
  );
}
