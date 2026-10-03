// Dev-only break-ui toggle. Swaps API responses for fixtures at the fetch boundary, so the
// components run unchanged. Loaded from main.tsx behind import.meta.env.DEV.
//
//   ?data=demo|worst|empty|one|huge   use that fixture for every event page
//   ?data=off                          back to the real API
//
// The choice is kept in sessionStorage too, because navigate() drops the query string.
import type { EventResponse, ParticipantResponse } from '@flexmeet/shared';
import { DATA_MODES, FIXTURES, WORST_CREATE_ERRORS, type DataMode } from './fixtures';

const STORAGE_KEY = 'flexmeet:data-mode';

function readMode(): DataMode | null {
  const param = new URLSearchParams(window.location.search).get('data');
  try {
    if (param === 'off') sessionStorage.removeItem(STORAGE_KEY);
    else if (param) sessionStorage.setItem(STORAGE_KEY, param);
    const stored = param ?? sessionStorage.getItem(STORAGE_KEY);
    return DATA_MODES.find((m) => m === stored) ?? null;
  } catch {
    return DATA_MODES.find((m) => m === param) ?? null;
  }
}

const mode = readMode();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

if (mode) {
  // A copy, so adding people or saving slots works for this page load.
  const event: EventResponse = structuredClone(FIXTURES[mode]);
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), window.location.href);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.pathname;

    if (path === '/api/events' && method === 'POST') {
      if (mode === 'worst') return json(WORST_CREATE_ERRORS, 400);
      return json({ ...event, slug: mode });
    }

    if (/^\/api\/events\/[^/]+$/.test(path) && method === 'GET') return json(event);

    if (/^\/api\/events\/[^/]+\/participants$/.test(path) && method === 'POST') {
      const { name } = JSON.parse(String(init?.body)) as { name: string };
      // Like the API's citext column: "jo" finds "Jo".
      const existing = event.participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existing) return json(existing);
      const added: ParticipantResponse = {
        id: Math.max(0, ...event.participants.map((p) => p.id)) + 1,
        name,
        slots: [],
      };
      event.participants.push(added);
      return json(added, 201);
    }

    const save = /^\/api\/events\/[^/]+\/participants\/(\d+)\/availability$/.exec(path);
    if (save && method === 'PUT') {
      const person = event.participants.find((p) => p.id === Number(save[1]));
      if (!person) return json({ error: 'Not found' }, 404);
      person.slots = (JSON.parse(String(init?.body)) as { slots: string[] }).slots;
      return json(person);
    }

    return realFetch(input, init);
  };
}

// The switch itself: plain DOM, fixed at the bottom-centre, deliberately unstyled chrome.
function mountToggle() {
  const options: [DataMode | 'off', string][] = [
    ['off', 'Real API'],
    ['demo', 'Demo data'],
    ['worst', 'Worst case'],
    ['empty', 'Empty'],
    ['one', 'One'],
    ['huge', 'Huge'],
  ];
  const bar = document.createElement('div');
  bar.setAttribute('data-dev-toggle', '');
  bar.style.cssText =
    'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;gap:2px;' +
    'padding:3px;background:#e5e5e5;border-radius:999px;font:12px system-ui,sans-serif;' +
    'box-shadow:0 1px 4px rgb(0 0 0 / 0.15);max-width:calc(100vw - 16px);overflow-x:auto';
  for (const [value, label] of options) {
    const button = document.createElement('button');
    const active = (mode ?? 'off') === value;
    button.textContent = label;
    button.style.cssText =
      'border:0;border-radius:999px;padding:4px 10px;cursor:pointer;white-space:nowrap;font:inherit;' +
      (active ? 'background:#fff;color:#111' : 'background:transparent;color:#555');
    button.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('data', value);
      window.location.href = url.toString();
    });
    bar.append(button);
  }
  document.body.append(bar);
  // Room to scroll the page's last element out from under the bar.
  document.body.style.paddingBottom = '56px';
}

mountToggle();
