import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useCoarsePointer } from '../lib/useCoarsePointer';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  label: string; // the list's accessible name, e.g. 'From'
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

const VISIBLE_ROWS = 6;

// The app's dropdown. On touch screens it's a native select, because the phone's own picker
// (a wheel on iOS, a list on Android) already shows a few rows that scroll, opened on the
// current value. With a mouse or trackpad a native select can fill the screen (48 times, 400+
// timezones), so it's a compact list instead: at most 6 rows, scrolled to the current value.
export function Select(props: SelectProps) {
  const touch = useCoarsePointer();
  return touch ? <NativeSelect {...props} /> : <Listbox {...props} />;
}

function NativeSelect({ id, value, options, onChange }: SelectProps) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Type-to-jump: the option that best matches what was typed, or -1.
// - Digits match times without their colon or leading zero ("14" finds 14:00, "9" finds
//   09:00), taking the first in the list, so times stay in order.
// - Words match the start of any part of the label ("sing" finds Asia/Singapore). When
//   several do, the alphabetically first part wins, so "lon" finds London before Longyearbyen.
function bestMatch(options: SelectOption[], typed: string): number {
  if (/^\d+$/.test(typed)) {
    const time = options.findIndex((o) => {
      const digits = o.label.replace(/\D/g, '');
      return digits.startsWith(typed) || digits.startsWith(`0${typed}`);
    });
    if (time !== -1) return time;
  }
  let best = -1;
  let bestPart = '';
  options.forEach((o, i) => {
    const part = o.label
      .toLowerCase()
      .split(/[\s/_]+/)
      .find((p) => p.startsWith(typed));
    if (part !== undefined && (best === -1 || part < bestPart)) {
      best = i;
      bestPart = part;
    }
  });
  return best;
}

function Listbox({ id, label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[selectedIndex];

  function openList() {
    // Open upwards if there isn't room below but there is above.
    const rect = triggerRef.current!.getBoundingClientRect();
    const listHeight = VISIBLE_ROWS * 36 + 2;
    const below = window.innerHeight - rect.bottom;
    setAbove(below < listHeight && rect.top > below);
    setActive(selectedIndex);
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  }

  // On open: focus the list and put the current time in the middle of it, with no scroll
  // animation (the list should simply appear showing the right place).
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const item = list?.children[selectedIndex] as HTMLElement | undefined;
    if (list && item) {
      list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2;
    }
    list?.focus({ preventScroll: true });
    // Only when it opens; arrow keys scroll it themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the keyboard's active row in view.
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({
      block: 'nearest',
    });
  }, [active, open]);

  // A click anywhere else closes it, without stealing focus back.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  }

  function handleListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowUp: active - 1,
      PageDown: active + VISIBLE_ROWS,
      PageUp: active - VISIBLE_ROWS,
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(Math.min(last, Math.max(0, moves[e.key]!)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      // Type to jump; keys typed within 800ms build up one search ("s", "si", "sin"...).
      const now = e.timeStamp; // ms, from the key event itself
      const text = ((now - typed.current.at < 800 ? typed.current.text : '') + e.key).toLowerCase();
      typed.current = { text, at: now };
      const match = bestMatch(options, text);
      if (match !== -1) setActive(match);
    }
  }

  return (
    <div className="listbox-select" ref={rootRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="listbox-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="listbox-select-value">{current?.label}</span>
        <span className="listbox-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          tabIndex={-1}
          className={`listbox-select-list ${above ? 'listbox-select-list-above' : ''}`}
          onKeyDown={handleListKeyDown}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={i === active ? 'listbox-select-active' : undefined}
              onMouseMove={() => i !== active && setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
