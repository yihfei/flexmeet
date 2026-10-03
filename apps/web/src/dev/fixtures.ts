// Dev-only fixtures for the break-ui toggle (see ./mockApi.ts). Never imported in production.
import { slotKey, slotStartMinutes, type EventResponse } from '@flexmeet/shared';

export const DATA_MODES = ['demo', 'worst', 'empty', 'one', 'huge'] as const;
export type DataMode = (typeof DATA_MODES)[number];

type EventFields = Omit<EventResponse, 'participants' | 'slug' | 'createdAt'>;

// Deterministic "random" so a reload shows the same grid.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

function consecutiveDates(start: string, count: number): string[] {
  const first = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(first.getTime() + i * 86_400_000).toISOString().slice(0, 10),
  );
}

// Each person is free in a few contiguous blocks, like real answers.
function blockSlots(event: EventFields, rand: () => number, density: number): string[] {
  const minutes = slotStartMinutes(event);
  const slots: string[] = [];
  for (const date of event.dates) {
    if (rand() > density) continue;
    const start = Math.floor(rand() * minutes.length);
    const length = 1 + Math.floor(rand() * Math.min(12, minutes.length));
    for (const m of minutes.slice(start, start + length)) slots.push(slotKey(date, m));
  }
  return slots;
}

function allSlots(event: EventFields): string[] {
  const minutes = slotStartMinutes(event);
  return event.dates.flatMap((d) => minutes.map((m) => slotKey(d, m)));
}

function makeEvent(
  slug: string,
  fields: EventFields,
  people: { name: string; slots?: 'none' | 'all' | number }[],
  seed: number,
): EventResponse {
  const rand = seeded(seed);
  return {
    ...fields,
    slug,
    createdAt: '2026-10-03T09:00:00.000Z',
    participants: people.map(({ name, slots = 0.6 }, i) => ({
      id: i + 1,
      name,
      slots:
        slots === 'none'
          ? []
          : slots === 'all'
            ? allSlots(fields)
            : blockSlots(fields, rand, slots),
    })),
  };
}

const FIRST = [
  'Mei',
  'Arjun',
  'Sofia',
  'Daniel',
  'Aisha',
  'Lukas',
  'Hana',
  'Mateo',
  'Priya',
  'Tom',
];
const LAST = ['Tan', 'Rao', 'Rossi', 'Kim', 'Okafor', 'Müller', 'Sato', 'García', 'Nair', 'Walsh'];

function fillerNames(count: number): { name: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}${
      i >= 100 ? ` ${Math.floor(i / 100) + 1}` : ''
    }`,
  }));
}

const worstFields: EventFields = {
  // 99 of the 100 characters the schema allows.
  title:
    'Q4 Planning Offsite — Product, Design & Engineering Leadership Sync (Northwind Industries Holdings)',
  // The schema's maximum of 31 dates, crossing a year boundary.
  dates: consecutiveDates('2026-12-20', 31),
  // A whole day in 15-minute slots: 96 rows.
  startMinute: 0,
  endMinute: 1440,
  slotMinutes: 15,
  durationMinutes: 120,
  timezone: 'America/Argentina/Rio_Gallegos',
};

const worstPeople = [
  { name: 'Aleksandra Wiśniewska-Kowalczyk' },
  { name: 'bartholomew.fitzgerald@northwind-holdings.example' }, // people do type emails as names
  { name: 'Jo' },
  { name: 'Christopher Alexander Montgomery III', slots: 'all' as const },
  { name: 'Đặng Thị Ngọc Hân' },
  { name: '王秀英' },
  { name: 'نور الهدى عبد الرحمن' },
  { name: '👩🏽‍💻 Priya' },
  { name: '<script>alert(1)</script>' },
  { name: 'Maximilian Konstantin Oberhauser-Wettstein-Bühler' }, // 49 of 50 characters
  { name: 'J', slots: 'none' as const }, // joined, never filled anything in
  ...fillerNames(28),
];

export const FIXTURES: Record<DataMode, EventResponse> = {
  demo: makeEvent(
    'demo',
    {
      title: 'Team lunch',
      dates: consecutiveDates('2026-10-12', 3),
      startMinute: 540,
      endMinute: 1020,
      slotMinutes: 30,
      durationMinutes: 60,
      timezone: 'Asia/Singapore',
    },
    [{ name: 'Jane Doe' }, { name: 'Bob Smith' }, { name: 'Alex Chen' }],
    1,
  ),
  worst: makeEvent('worst', worstFields, worstPeople, 2),
  huge: makeEvent('huge', worstFields, [...worstPeople, ...fillerNames(150).slice(40)], 3),
  empty: makeEvent(
    'empty',
    {
      title: 'Team lunch',
      dates: consecutiveDates('2026-10-12', 1),
      startMinute: 540,
      endMinute: 1020,
      slotMinutes: 30,
      durationMinutes: null,
      timezone: 'Asia/Singapore',
    },
    [],
    4,
  ),
  one: makeEvent(
    'one',
    {
      title: '1:1',
      dates: consecutiveDates('2026-10-12', 1),
      // A single 30-minute slot that doesn't start on the hour.
      startMinute: 570,
      endMinute: 600,
      slotMinutes: 30,
      durationMinutes: 30,
      timezone: 'Asia/Singapore',
    },
    [{ name: 'Sam', slots: 'all' }],
    5,
  ),
};

// What the create page's API answers in worst mode: every field rejected at once.
export const WORST_CREATE_ERRORS = {
  error: 'Invalid request',
  details: {
    fieldErrors: {
      title: ['Keep the title to 100 characters or fewer'],
      dates: ['Pick at most 31 dates'],
      startMinute: ['Start must be on a 15-minute boundary'],
      endMinute: ['End must be after start'],
      slotMinutes: ['Slot size must be 15 or 30 minutes'],
      durationMinutes: ['Duration is longer than the daily time window'],
      timezone: ['Unknown timezone'],
    },
  },
};
