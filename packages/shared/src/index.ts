// Types and schemas shared by the API and the web app.

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
}

export * from './event.js';
export * from './participant.js';
export * from './slots.js';
export * from './best-times.js';
