import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { eventsRouter } from './routes/events.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  if (env.CORS_ORIGIN) app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/events', eventsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  return app;
}
