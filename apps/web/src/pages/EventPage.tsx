import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import type { EventResponse, ParticipantResponse } from '@flexmeet/shared';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { GroupGrid } from '../components/GroupGrid';
import { ParticipantPicker } from '../components/ParticipantPicker';
import { minutesToTime } from '../lib/time';
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
      return (
        <div className="state">
          <p className="muted">Loading event…</p>
        </div>
      );
    case 'not-found':
      return <NotFoundPage message="Event not found" />;
    case 'error':
      return (
        <div className="state card">
          <h1>Couldn't load this event</h1>
          <p className="muted">Something went wrong reaching the server. Try again in a moment.</p>
          <p>
            <button type="button" className="primary" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </p>
        </div>
      );
    case 'loaded':
      return <EventDetails event={state.event} />;
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function EventDetails({ event }: { event: EventResponse }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [participants, setParticipants] = useState(event.participants);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // Each save gets a number; responses from older saves are ignored if they arrive late.
  const latestSave = useRef(0);

  const me = participants.find((p) => p.id === selectedId) ?? null;
  const mySlots = useMemo(() => new Set(me?.slots), [me]);

  function replaceParticipant(updated: ParticipantResponse) {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleAdded(participant: ParticipantResponse) {
    setParticipants((prev) =>
      prev.some((p) => p.id === participant.id) ? prev : [...prev, participant],
    );
    setSelectedId(participant.id);
  }

  async function saveSlots(next: Set<string>) {
    if (!me) return;
    const previous = me;
    const slots = [...next].sort();
    const saveId = ++latestSave.current;

    // Optimistic update: show the change now, roll back if the save fails.
    replaceParticipant({ ...me, slots });
    setSaveState('saving');
    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.slug)}/participants/${me.id}/availability`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots }),
        },
      );
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const saved = (await res.json()) as ParticipantResponse;
      if (saveId !== latestSave.current) return;
      replaceParticipant(saved);
      setSaveState('saved');
    } catch {
      if (saveId !== latestSave.current) return;
      replaceParticipant(previous);
      setSaveState('error');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // The clipboard API only exists on https and localhost (not e.g. a phone on the
      // LAN), and can be denied. Show the link so it can be copied by hand instead.
      setCopyFailed(true);
    }
  }

  return (
    <div className="event-page">
      <h1>{event.title}</h1>
      {/* The dates are already the grid's column headers, so they aren't repeated here. */}
      <p className="muted event-meta">
        {minutesToTime(event.startMinute)}–{minutesToTime(event.endMinute)} · {event.timezone} ·{' '}
        {event.slotMinutes}-min slots
        {event.durationMinutes !== null && ` · ${event.durationMinutes}-min meeting`}
      </p>

      <p>
        Share this link so people can add their availability:{' '}
        {copyFailed ? (
          <input
            className="share-link"
            aria-label="Event link"
            readOnly
            autoFocus
            value={window.location.href}
            onFocus={(e) => e.currentTarget.select()}
          />
        ) : (
          <button type="button" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        )}
      </p>

      <ParticipantPicker
        slug={event.slug}
        participants={participants}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSaveState('idle');
        }}
        onAdded={handleAdded}
      />

      <div className="grids">
        <section>
          <h2>{me ? `${me.name}'s availability` : 'Your availability'}</h2>
          {me ? (
            <AvailabilityGrid
              event={event}
              selected={mySlots}
              onChange={saveSlots}
              hint={
                <p className="muted">
                  Drag across the grid to mark when you're free. <SaveStatus state={saveState} />
                </p>
              }
            />
          ) : (
            <div className="grid-meta">
              <p className="muted">Choose or add your name above to fill in your availability.</p>
            </div>
          )}
        </section>
        <section>
          <h2>Group availability</h2>
          <GroupGrid event={event} participants={participants} />
        </section>
      </div>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  switch (state) {
    case 'idle':
      return null;
    case 'saving':
      return <span>Saving…</span>;
    case 'saved':
      return <span>Saved.</span>;
    case 'error':
      return <span className="error">Couldn't save. Your last change was undone.</span>;
  }
}
