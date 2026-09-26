// Types and schemas shared by the API and the web app.

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
}
