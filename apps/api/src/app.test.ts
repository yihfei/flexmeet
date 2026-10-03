import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

describe('serving the built web app', () => {
  // A stand-in for apps/web/dist.
  const webDist = mkdtempSync(path.join(tmpdir(), 'flexmeet-web-'));
  mkdirSync(path.join(webDist, 'assets'));
  writeFileSync(path.join(webDist, 'index.html'), '<!doctype html><title>FlexMeet</title>');
  writeFileSync(path.join(webDist, 'assets', 'index-abc123.js'), 'console.log(1);');
  const app = createApp({ webDist });

  it('serves index.html for the home page and for page URLs, uncached', async () => {
    for (const url of ['/', '/e/abc123']) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.text).toContain('<title>FlexMeet</title>');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('caches hashed assets for a year', async () => {
    const res = await request(app).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('returns 404 for a missing asset instead of the page', async () => {
    const res = await request(app).get('/assets/missing.js');
    expect(res.status).toBe(404);
  });

  it('still answers unknown API routes with JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('serves only the API when there is no web app', async () => {
    const res = await request(createApp({ webDist: undefined })).get('/e/abc123');
    expect(res.status).toBe(404);
  });
});
