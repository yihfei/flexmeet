import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { joinEventSchema, type ParticipantResponse } from '@flexmeet/shared';

interface ParticipantPickerProps {
  slug: string;
  participants: ParticipantResponse[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAdded: (participant: ParticipantResponse) => void;
}

// Small groups see every name at once; past this, a filter appears above them.
const FILTER_AFTER = 12;

// Every name is a button, so people recognise theirs instead of typing it, and "I'm new"
// adds a name. Once someone is chosen, the roster folds away to one line.
export function ParticipantPicker({
  slug,
  participants,
  selectedId,
  onSelect,
  onAdded,
}: ParticipantPickerProps) {
  const me = participants.find((p) => p.id === selectedId);
  const [changing, setChanging] = useState(false);
  const [filter, setFilter] = useState('');
  // With no one to choose from, go straight to adding a name.
  const [addingNew, setAddingNew] = useState(participants.length === 0);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const result = joinEventSchema.safeParse({ name });
    if (!result.success) {
      setError(z.flattenError(result.error).fieldErrors.name?.[0] ?? 'Invalid name');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (!res.ok) {
        setError("Couldn't add that name. Please try again.");
        return;
      }
      // If the name already existed (ignoring case), the API returns that participant instead.
      onAdded((await res.json()) as ParticipantResponse);
      setName('');
      setAddingNew(false);
      setChanging(false);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  if (me && !changing) {
    return (
      <div className="picker picker-identity">
        <span>
          You're{' '}
          <strong>
            <bdi>{me.name}</bdi>
          </strong>
        </span>
        <button type="button" className="link-button" onClick={() => setChanging(true)}>
          Not you?
        </button>
      </div>
    );
  }

  const query = filter.trim().toLowerCase();
  const shown = query
    ? participants.filter((p) => p.name.toLowerCase().includes(query))
    : participants;

  return (
    <div className="picker">
      <p className="picker-label">Who are you?</p>
      {participants.length > 0 && <p className="muted picker-hint">Tap your name, or add yours.</p>}

      {participants.length > FILTER_AFTER && (
        <input
          type="search"
          className="picker-filter"
          aria-label="Find your name"
          placeholder={`Find your name among ${participants.length}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      <div className="picker-names">
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={p.id === selectedId}
            onClick={() => {
              onSelect(p.id);
              setChanging(false);
            }}
          >
            <bdi>{p.name}</bdi>
          </button>
        ))}
        {filter && shown.length === 0 && (
          <p className="muted picker-hint">
            No one called “<bdi>{filter}</bdi>” yet.
          </p>
        )}
        {!addingNew && (
          <button
            type="button"
            className="chip chip-new"
            onClick={() => {
              setAddingNew(true);
              setName(filter); // they may have already typed their name into the filter
            }}
          >
            + I'm new
          </button>
        )}
      </div>

      {addingNew && (
        <form className="picker-new" onSubmit={handleAdd} noValidate>
          <input
            aria-label="Your name"
            placeholder="Your name"
            maxLength={50}
            autoFocus={participants.length > 0}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="primary" disabled={adding}>
            {adding ? 'Adding…' : 'Add me'}
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
