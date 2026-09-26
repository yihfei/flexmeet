import { useEffect, useState } from 'react';
import type { HealthResponse } from '@flexmeet/shared';

export function App() {
  const [health, setHealth] = useState<HealthResponse | 'unreachable' | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>FlexMeet</h1>
      {health === null && <p>Checking API…</p>}
      {health === 'unreachable' && <p>API: unreachable</p>}
      {health && health !== 'unreachable' && (
        <p>
          API: {health.status} / DB: {health.db}
        </p>
      )}
    </main>
  );
}
