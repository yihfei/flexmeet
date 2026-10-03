import { useEffect, useState } from 'react';
import type { HealthResponse } from '@flexmeet/shared';

export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | 'unreachable' | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setHealth('unreachable'));
  }, []);

  if (health === null) return <span className="api-status">Checking API…</span>;
  if (health === 'unreachable') {
    return (
      <span className="api-status" data-state="error">
        API unreachable
      </span>
    );
  }
  return (
    <span
      className="api-status"
      data-state={health.status === 'ok' && health.db === 'ok' ? 'ok' : 'error'}
    >
      API: {health.status} / DB: {health.db}
    </span>
  );
}
