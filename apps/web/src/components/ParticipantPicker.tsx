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

// Choose who you are from the existing names, or type a new name to add yourself.
export function ParticipantPicker({
  slug,
  participants,
  selectedId,
  onSelect,
  onAdded,
}: ParticipantPickerProps) {
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
      // If the name already existed, the API returns that participant instead.
      onAdded((await res.json()) as ParticipantResponse);
      setName('');
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="row picker">
      <div className="field">
        <label htmlFor="participant">Who are you?</label>
        <select
          id="participant"
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value === '' ? null : Number(e.target.value))}
          disabled={participants.length === 0}
        >
          <option value="">
            {participants.length === 0 ? 'No one yet — add your name' : 'Choose your name'}
          </option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <form className="field" onSubmit={handleAdd} noValidate>
        <label htmlFor="new-name">…or add a new name</label>
        <div className="row">
          <input
            id="new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
          />
          <button type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
