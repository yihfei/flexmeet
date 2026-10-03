import { useEffect, useState } from 'react';

// One button to invite people. Where the browser has a share sheet (phones, Safari) it opens
// it, so the link can go straight into a chat; elsewhere it copies the link and says so for a
// moment. If neither works (no clipboard on plain http, or permission denied), the link is
// shown selected so it can be copied by hand.
export function ShareButton({ title }: { title: string }) {
  // The event's address without query strings (e.g. dev-only ?data=...).
  const url = `${window.location.origin}${window.location.pathname}`;
  const canShare = typeof navigator.share === 'function';
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function share() {
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // Closing the share sheet isn't an error; anything else falls back to copying.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('manual');
    }
  }

  if (state === 'manual') {
    return (
      <input
        className="share-link"
        aria-label="Event link"
        readOnly
        autoFocus
        value={url}
        onFocus={(e) => e.currentTarget.select()}
      />
    );
  }
  return (
    <button type="button" className="share-button" onClick={share} aria-live="polite">
      {state === 'copied' ? 'Link copied' : canShare ? 'Share event' : 'Copy link'}
    </button>
  );
}
