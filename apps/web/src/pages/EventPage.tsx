import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { EventResponse } from '@flexmeet/shared';
import { formatYmd, minutesToTime } from '../lib/time';
import { NotFoundPage } from './NotFoundPage';

// One state value instead of separate loading/error/data flags, so impossible
// combinations (e.g. loading *and* loaded) can't be represented.
type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'loaded'; event: EventResponse };

export function EventPage() {
  const { slug } = useParams();
  if (!slug) return <NotFoundPage message="Event not found" />;
  // key: a different slug remounts EventView, so the old event never flashes on screen.
  return <EventView key={slug} slug={slug} />;
}

function EventView({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    // Abort on unmount so a late response can't update a page we've left.
    const controller = new AbortController();

    fetch(`/api/events/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) return setState({ status: 'not-found' });
        if (!res.ok) return setState({ status: 'error' });
        const event = (await res.json()) as EventResponse;
        setState({ status: 'loaded', event });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });

    return () => controller.abort();
  }, [slug]);

  switch (state.status) {
    case 'loading':
      return <p className="muted">Loading event…</p>;
    case 'not-found':
      return <NotFoundPage message="Event not found" />;
    case 'error':
      return <p className="error">Couldn't load this event. Try refreshing.</p>;
    case 'loaded':
      return <EventDetails event={state.event} />;
  }
}

function EventDetails({ event }: { event: EventResponse }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <>
      <h1>{event.title}</h1>

      <p>
        Share this link so people can add their availability:{' '}
        <button type="button" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </p>

      <dl className="details">
        <dt>Time</dt>
        <dd>
          {minutesToTime(event.startMinute)}–{minutesToTime(event.endMinute)} ({event.timezone})
        </dd>
        <dt>Slots</dt>
        <dd>{event.slotMinutes} minutes</dd>
        {event.durationMinutes !== null && (
          <>
            <dt>Meeting length</dt>
            <dd>{event.durationMinutes} minutes</dd>
          </>
        )}
        <dt>Dates</dt>
        <dd>
          <ul className="date-list">
            {event.dates.map((date) => (
              <li key={date}>{formatYmd(date)}</li>
            ))}
          </ul>
        </dd>
      </dl>

      {/* TODO: availability grid (dates × time slots) goes here. */}
    </>
  );
}
