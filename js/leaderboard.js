const LS_KEY = 'halo-leaderboard-v1';

async function loadConfig() {
  try {
    return await import('./leaderboard-config.js');
  } catch {
    return { LEADERBOARD_URL: '', LEADERBOARD_TOKEN: '' };
  }
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

function withToken(url, token) {
  if (!token) return url;
  const u = new URL(url);
  u.searchParams.set('token', token);
  return u.href;
}

export async function fetchBoard(trackId) {
  const { LEADERBOARD_URL, LEADERBOARD_TOKEN } = await loadConfig();
  if (!LEADERBOARD_URL) {
    return readLocal().filter((r) => !trackId || r.trackId === trackId);
  }
  const base = withToken(LEADERBOARD_URL, LEADERBOARD_TOKEN);
  const u = new URL(base);
  if (trackId) u.searchParams.set('trackId', trackId);
  const res = await fetch(u.href);
  if (!res.ok) throw new Error(`Leaderboard fetch failed (${res.status})`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

export async function submitRun(payload) {
  const row = {
    ts: new Date().toISOString(),
    name: String(payload.name || 'anon').slice(0, 64),
    trackId: payload.trackId || 'ozark',
    timeSec: Number(payload.timeSec),
    whUsed: Number(payload.whUsed || 0),
    valid: !!payload.valid,
    effEligible: !!payload.effEligible,
    simVersion: payload.simVersion || '',
    packId: payload.packId || '',
  };

  const { LEADERBOARD_URL, LEADERBOARD_TOKEN } = await loadConfig();
  if (!LEADERBOARD_URL) {
    const all = readLocal();
    all.push(row);
    writeLocal(all);
    return { ok: true, storage: 'local' };
  }

  const url = withToken(LEADERBOARD_URL, LEADERBOARD_TOKEN);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Leaderboard submit failed (${res.status})`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return { ok: true, storage: 'sheet', ...data };
}

/** Best valid pace (min time) per name. */
export function bestPacePerName(rows) {
  const map = new Map();
  rows.filter((r) => r.valid && Number.isFinite(Number(r.timeSec))).forEach((r) => {
    const t = Number(r.timeSec);
    const prev = map.get(r.name);
    if (!prev || t < prev.timeSec) map.set(r.name, { ...r, timeSec: t, whUsed: Number(r.whUsed) });
  });
  return [...map.values()].sort((a, b) => a.timeSec - b.timeSec);
}

/** Best efficiency (min Wh) per name among eff-eligible valid laps. */
export function bestEfficiencyPerName(rows) {
  const map = new Map();
  rows.filter((r) => r.valid && r.effEligible && Number.isFinite(Number(r.whUsed))).forEach((r) => {
    const w = Number(r.whUsed);
    const prev = map.get(r.name);
    if (!prev || w < prev.whUsed) map.set(r.name, { ...r, timeSec: Number(r.timeSec), whUsed: w });
  });
  return [...map.values()].sort((a, b) => a.whUsed - b.whUsed);
}

export function formatTime(sec) {
  if (sec == null || !Number.isFinite(sec)) return '–';
  return Math.floor(sec / 60) + ':' + (sec % 60).toFixed(3).padStart(6, '0');
}

/** 1-based place for name in a sorted best-per-name list, or null. */
export function placeOf(list, name) {
  const i = list.findIndex((r) => r.name === name);
  return i < 0 ? null : i + 1;
}

export function formatPlace(place, total) {
  if (place == null) return '—';
  return total != null ? `${place} of ${total}` : String(place);
}
