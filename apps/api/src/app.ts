import path from 'node:path';
import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { eventsRouter } from './routes/events.js';
import { healthRouter } from './routes/health.js';

// webDist: the built web app to serve alongside the API (defaults to WEB_DIST; tests pass
// their own folder). Without it, only the API is served.
export function createApp({ webDist = env.WEB_DIST }: { webDist?: string } = {}) {
  const app = express();

  app.use(helmet());
  if (env.CORS_ORIGIN) app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/events', eventsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (webDist) serveWebApp(app, path.resolve(webDist));

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  return app;
}

// One server for the whole app in production: the built site, plus the API above.
function serveWebApp(app: Express, root: string) {
  // Vite's file names include a content hash, so a file under /assets never changes.
  app.use('/assets', express.static(path.join(root, 'assets'), { immutable: true, maxAge: '1y' }));
  // A missing asset is a real 404, not the app's HTML.
  app.use('/assets', (_req, res) => {
    res.sendStatus(404);
  });
  app.use(express.static(root, { index: false }));
  // Page URLs like /e/abc get index.html and the client-side router takes over. no-cache so a
  // new deploy's index.html (pointing at new asset hashes) is picked up straight away.
  app.get('/{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(root, 'index.html'));
  });
}
