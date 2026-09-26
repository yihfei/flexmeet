import { Router } from 'express';
import type { HealthResponse } from '@flexmeet/shared';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: HealthResponse['db'] = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  const body: HealthResponse = { status: db === 'ok' ? 'ok' : 'error', db };
  res.status(db === 'ok' ? 200 : 503).json(body);
});
