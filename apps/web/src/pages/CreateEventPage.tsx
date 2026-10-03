import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { createEventSchema, type CreateEventInput, type EventResponse } from '@flexmeet/shared';
import { MINUTES_PER_DAY, timeToMinutes, todayYmd } from '../lib/time';

type FieldErrors = Partial<Record<keyof CreateEventInput, string[]>>;

const SLOT_OPTIONS = [15, 30] as const;
// Multiples of 30, so every option is valid for both slot sizes.
const DURATION_OPTIONS = [30, 60, 90, 120];

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const allTimeZones = Intl.supportedValuesOf('timeZone');

export function CreateEventPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState<string[]>([todayYmd()]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotMinutes, setSlotMinutes] = useState<(typeof SLOT_OPTIONS)[number]>(30);
  const [durationMinutes, setDurationMinutes] = useState(''); // '' = not set
  const [timezone, setTimezone] = useState(browserTimeZone);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateDate(index: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function removeDate(index: number) {
    setDates((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const endMinute = timeToMinutes(endTime);
    const input = {
      title,
      dates,
      startMinute: timeToMinutes(startTime),
      // A time input can't say 24:00, so an end of 00:00 means "until midnight".
      endMinute: endMinute === 0 ? MINUTES_PER_DAY : endMinute,
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

      <form onSubmit={handleSubmit} noValidate>
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
          {dates.map((date, index) => (
            <div key={index} className="row">
              <input
                type="date"
                aria-label={`Date ${index + 1}`}
                value={date}
                onChange={(e) => updateDate(index, e.target.value)}
              />
              {dates.length > 1 && (
                <button type="button" onClick={() => removeDate(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {dates.length < 31 && (
            <button type="button" onClick={() => setDates((prev) => [...prev, ''])}>
              + Add date
            </button>
          )}
          <FieldError messages={fieldErrors.dates} />
        </fieldset>

        <div className="row">
          <div className="field">
            <label htmlFor="start">No earlier than</label>
            <input
              id="start"
              type="time"
              step={slotMinutes * 60}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <FieldError messages={fieldErrors.startMinute} />
          </div>
          <div className="field">
            <label htmlFor="end">No later than</label>
            <input
              id="end"
              type="time"
              step={slotMinutes * 60}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <FieldError messages={fieldErrors.endMinute} />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="slot">Slot size</label>
            <select
              id="slot"
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value) as 15 | 30)}
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <FieldError messages={fieldErrors.slotMinutes} />
          </div>
          <div className="field">
            <label htmlFor="duration">Length (optional)</label>
            <select
              id="duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            >
              <option value="">Not set</option>
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <FieldError messages={fieldErrors.durationMinutes} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {allTimeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
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
