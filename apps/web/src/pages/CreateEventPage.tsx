import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { createEventSchema, type CreateEventInput, type EventResponse } from '@flexmeet/shared';
import { DatePicker } from '../components/DatePicker';
import { Select } from '../components/Select';
import { MINUTES_PER_DAY, minutesToTime } from '../lib/time';

type FieldErrors = Partial<Record<keyof CreateEventInput, string[]>>;

const SLOT_OPTIONS = [15, 30] as const;
const MAX_DATES = 31; // the schema's limit
// Multiples of 30, so every option is valid for both slot sizes.
const DURATION_OPTIONS = [30, 60, 90, 120];
// One tap for the windows most events use. All on the hour, so valid for both slot sizes.
const TIME_PRESETS = [
  { label: 'Morning', start: 540, end: 720 },
  { label: 'Work day', start: 540, end: 1020 },
  { label: 'Evening', start: 1080, end: 1320 },
  { label: 'All day', start: 0, end: 1440 },
];

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const allTimeZones = Intl.supportedValuesOf('timeZone');

export function CreateEventPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  // Minutes after midnight, like the API: 540 = 09:00, 1440 = the end of the day.
  const [startMinute, setStartMinute] = useState(540);
  const [endMinute, setEndMinute] = useState(1020);
  const [slotMinutes, setSlotMinutes] = useState<(typeof SLOT_OPTIONS)[number]>(30);
  const [durationMinutes, setDurationMinutes] = useState(''); // '' = not set

  // Only times on a slot boundary are offered, so the form can't ask for 09:07. The end is
  // always after the start, and can be 24:00 (the end of the day). Lengths must fit the window.
  const startOptions = everySlot(0, MINUTES_PER_DAY - slotMinutes, slotMinutes);
  const endOptions = everySlot(startMinute + slotMinutes, MINUTES_PER_DAY, slotMinutes);
  const durationOptions = DURATION_OPTIONS.filter((m) => m <= endMinute - startMinute);

  // Every change to the window goes through here (pickers, presets, slot size), so the rules
  // always hold: on the slot grid, end after start, and a length that still fits.
  function setWindow(start: number, end: number, slot: (typeof SLOT_OPTIONS)[number]) {
    // Going from 15- to 30-minute slots snaps 09:15 down and 10:45 up: the window only grows.
    const s = Math.floor(start / slot) * slot;
    const e = Math.max(Math.min(Math.ceil(end / slot) * slot, MINUTES_PER_DAY), s + slot);
    setSlotMinutes(slot);
    setStartMinute(s);
    setEndMinute(e);
    if (durationMinutes !== '' && Number(durationMinutes) > e - s) setDurationMinutes('');
  }
  const [timezone, setTimezone] = useState(browserTimeZone);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const input = {
      title,
      dates,
      startMinute,
      endMinute,
      slotMinutes,
      durationMinutes: durationMinutes === '' ? undefined : Number(durationMinutes),
      timezone,
    };

    // Same schema the API uses, so most mistakes are caught before a round trip.
    const result = createEventSchema.safeParse(input);
    if (!result.success) {
      setFieldErrors(z.flattenError(result.error).fieldErrors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (res.status === 400) {
        const body = (await res.json()) as { details?: { fieldErrors?: FieldErrors } };
        setFieldErrors(body.details?.fieldErrors ?? {});
        setFormError('Please fix the errors below.');
        return;
      }
      if (!res.ok) {
        setFormError('Something went wrong creating the event. Please try again.');
        return;
      }

      const event = (await res.json()) as EventResponse;
      navigate(`/e/${event.slug}`);
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Create an event</h1>

      <form className="card" onSubmit={handleSubmit} noValidate>
        {formError && <p className="error">{formError}</p>}

        <div className="field">
          <label htmlFor="title">Event name</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team lunch"
            maxLength={100}
          />
          <FieldError messages={fieldErrors.title} />
        </div>

        <fieldset className="field">
          <legend>Dates</legend>
          <DatePicker value={dates} onChange={setDates} max={MAX_DATES} />
          <FieldError messages={fieldErrors.dates} />
        </fieldset>

        <fieldset className="field">
          <legend>Time of day</legend>
          <div className="time-presets">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                aria-pressed={p.start === startMinute && p.end === endMinute}
                onClick={() => setWindow(p.start, p.end, slotMinutes)}
              >
                {p.label}{' '}
                <span className="time-preset-range">
                  {minutesToTime(p.start)}–{minutesToTime(p.end)}
                </span>
              </button>
            ))}
          </div>
          <div className="row time-range">
            <div className="field">
              <label htmlFor="start">From</label>
              <Select
                id="start"
                label="From"
                value={String(startMinute)}
                options={startOptions.map((m) => ({ value: String(m), label: minutesToTime(m) }))}
                onChange={(v) => {
                  const start = Number(v);
                  // Moving the start to or past the end pushes the end one slot later.
                  setWindow(
                    start,
                    endMinute <= start ? start + slotMinutes : endMinute,
                    slotMinutes,
                  );
                }}
              />
              <FieldError messages={fieldErrors.startMinute} />
            </div>
            <div className="field">
              <label htmlFor="end">Until</label>
              <Select
                id="end"
                label="Until"
                value={String(endMinute)}
                options={endOptions.map((m) => ({
                  value: String(m),
                  label: m === MINUTES_PER_DAY ? '24:00 (midnight)' : minutesToTime(m),
                }))}
                onChange={(v) => setWindow(startMinute, Number(v), slotMinutes)}
              />
              <FieldError messages={fieldErrors.endMinute} />
            </div>
          </div>
          {/* What the window means, on a reserved line so changing it never moves the form. */}
          <p className="muted time-summary">
            {describeWindow(endMinute - startMinute, slotMinutes)}
          </p>
        </fieldset>

        <div className="row">
          <div className="field">
            <label htmlFor="slot">Slot size</label>
            <Select
              id="slot"
              label="Slot size"
              value={String(slotMinutes)}
              options={SLOT_OPTIONS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
              onChange={(v) => setWindow(startMinute, endMinute, Number(v) as 15 | 30)}
            />
            <FieldError messages={fieldErrors.slotMinutes} />
          </div>
          <div className="field">
            <label htmlFor="duration">Length (optional)</label>
            <Select
              id="duration"
              label="Length"
              value={durationMinutes}
              options={[
                { value: '', label: 'Not set' },
                ...durationOptions.map((m) => ({ value: String(m), label: `${m} minutes` })),
              ]}
              onChange={setDurationMinutes}
            />
            <FieldError messages={fieldErrors.durationMinutes} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <Select
            id="timezone"
            label="Timezone"
            value={timezone}
            options={allTimeZones.map((tz) => ({ value: tz, label: tz }))}
            onChange={setTimezone}
          />
          <FieldError messages={fieldErrors.timezone} />
        </div>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="error">{messages[0]}</p>;
}

// from, from + step, ..., to (inclusive).
function everySlot(from: number, to: number, step: number): number[] {
  const minutes: number[] = [];
  for (let m = from; m <= to; m += step) minutes.push(m);
  return minutes;
}

// 480 minutes in 30-minute slots -> '8 hours a day · 16 slots of 30 min'
function describeWindow(minutes: number, slotMinutes: number): string {
  const hours = minutes / 60;
  const length = minutes < 60 ? `${minutes} minutes` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const slots = minutes / slotMinutes;
  return `${length} a day · ${slots} ${slots === 1 ? 'slot' : 'slots'} of ${slotMinutes} min`;
}
