import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const create = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();
const findFirst = vi.fn();
const update = vi.fn();
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    event: { create, findUnique },
    participant: { upsert, findFirst, update },
  },
}));
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');

const { createApp } = await import('../app.js');

const validBody = {
  title: 'Team lunch',
  dates: ['2026-10-03', '2026-10-05'],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  timezone: 'Asia/Singapore',
};

const row = {
  id: 1,
  slug: 'kX3f9_aQ2bM',
  title: 'Team lunch',
  dates: [new Date('2026-10-03'), new Date('2026-10-05')],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  durationMinutes: null,
  timezone: 'Asia/Singapore',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

const participantRow = {
  id: 7,
  eventId: 1,
  name: 'Alice',
  slots: [] as string[],
  createdAt: new Date('2026-10-02T12:00:00.000Z'),
  updatedAt: new Date('2026-10-02T12:00:00.000Z'),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/events', () => {
  it('creates an event and returns it without internal fields', async () => {
    create.mockResolvedValue(row);

    const res = await request(createApp()).post('/api/events').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('kX3f9_aQ2bM');
    expect(res.body.dates).toEqual(['2026-10-03', '2026-10-05']);
    expect(res.body).not.toHaveProperty('id');
  });

  it('passes dates to Prisma as Date objects', async () => {
    create.mockResolvedValue(row);

    await request(createApp()).post('/api/events').send(validBody);

    const data = create.mock.calls[0]?.[0].data;
    expect(data.dates).toEqual([new Date('2026-10-03'), new Date('2026-10-05')]);
  });

  it('returns 400 with field errors for an invalid body', async () => {
    const res = await request(createApp())
      .post('/api/events')
      .send({ ...validBody, endMinute: 480 });

    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors.endMinute).toEqual(['End must be after start']);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 400 when there is no body', async () => {
    const res = await request(createApp()).post('/api/events');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:slug', () => {
  it('returns the event with its participants', async () => {
    findUnique.mockResolvedValue({ ...row, participants: [participantRow] });

    const res = await request(createApp()).get('/api/events/kX3f9_aQ2bM');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Team lunch');
    expect(res.body.participants).toEqual([{ id: 7, name: 'Alice', slots: [] }]);
    expect(findUnique.mock.calls[0]?.[0].where).toEqual({ slug: 'kX3f9_aQ2bM' });
  });

  it('returns 404 for an unknown slug', async () => {
    findUnique.mockResolvedValue(null);

    const res = await request(createApp()).get('/api/events/nope');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/events/:slug/participants', () => {
  it('upserts the participant by trimmed name', async () => {
    findUnique.mockResolvedValue(row);
    upsert.mockResolvedValue(participantRow);

    const res = await request(createApp())
      .post('/api/events/kX3f9_aQ2bM/participants')
      .send({ name: '  Alice ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, name: 'Alice', slots: [] });
    expect(upsert.mock.calls[0]?.[0].where).toEqual({
      eventId_name: { eventId: 1, name: 'Alice' },
    });
  });

  it('returns 400 for a blank name', async () => {
    const res = await request(createApp())
      .post('/api/events/kX3f9_aQ2bM/participants')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown event', async () => {
    findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post('/api/events/nope/participants')
      .send({ name: 'Alice' });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/events/:slug/participants/:id/availability', () => {
  const url = '/api/events/kX3f9_aQ2bM/participants/7/availability';

  it('saves the slots de-duplicated and sorted', async () => {
    findFirst.mockResolvedValue({ ...participantRow, event: row });
    update.mockImplementation(({ data }) => ({ ...participantRow, slots: data.slots }));

    const res = await request(createApp())
      .put(url)
      .send({ slots: ['2026-10-05T10:00', '2026-10-03T09:00', '2026-10-05T10:00'] });

    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual(['2026-10-03T09:00', '2026-10-05T10:00']);
  });

  it('only finds participants of the event in the URL', async () => {
    findFirst.mockResolvedValue(null);

    const res = await request(createApp()).put(url).send({ slots: [] });

    expect(res.status).toBe(404);
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({ id: 7, event: { slug: 'kX3f9_aQ2bM' } });
  });

  it('rejects slots that are not on the event grid', async () => {
    findFirst.mockResolvedValue({ ...participantRow, event: row });

    const res = await request(createApp())
      .put(url)
      .send({ slots: ['2026-10-03T09:00', '2026-10-03T17:00', '2026-10-04T09:00'] });

    expect(res.status).toBe(400);
    expect(res.body.invalid).toEqual(['2026-10-03T17:00', '2026-10-04T09:00']);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 404 for a non-numeric id', async () => {
    const res = await request(createApp())
      .put('/api/events/kX3f9_aQ2bM/participants/abc/availability')
      .send({ slots: [] });

    expect(res.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
