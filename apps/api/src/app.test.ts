import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./lib/prisma.js', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) },
}));
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');

const { createApp } = await import('./app.js');

describe('GET /api/health', () => {
  it('returns ok when the database responds', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('returns 404 JSON for unknown API routes', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
