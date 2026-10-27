import { loadTrackById } from './tracks.js';
import { initRace, teardownRace, getSessionBest } from './race.js';
import {
  fetchBoard, submitRun, bestPacePerName, bestEfficiencyPerName,
  formatTime, placeOf, formatPlace,
} from './leaderboard.js';

const DEFAULT_TRACK = 'ozark';

let sim = null;
let mode = 'landing'; // landing | practice | race
let quitting = false;

export function getMode() { return mode; }

export function initMode(simApi) {
  sim = simApi;
  wireLanding();
  wireQuitModal();
  wireLeaderboard();
  showLanding();
}

function el(id) { return document.getElementById(id); }

function show(id, on) {
  const n = el(id);
  if (!n) return;
  if (id === 'landing' || id === 'boards') n.style.display = on ? 'flex' : 'none';
  else n.style.display = on ? '' : 'none';
}

function wireLanding() {
  el('btn-practice').onclick = () => enterPractice();
  el('btn-race').onclick = () => {
    el('race-lobby').style.display = 'block';
    el('landing-actions').style.display = 'none';
  };
  el('btn-race-cancel').onclick = () => {
    el('race-lobby').style.display = 'none';
    el('landing-actions').style.display = 'flex';
  };
  el('btn-race-go').onclick = () => {
    const name = (el('race-username').value || '').trim();
    if (!name) {
      el('race-username').focus();
      return;
    }
    enterRace(name);
  };
  el('btn-boards').onclick = () => openBoards();
  el('btn-boards-close').onclick = () => { el('boards').style.display = 'none'; };
  el('btn-exit-mode').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'race') openRaceQuit();
    else exitToLanding();
  };
}

function wireQuitModal() {
  el('btn-race-return').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    quitting = false;
    exitToLanding();
  };
}

function wireLeaderboard() {
  el('boards-tab-pace').onclick = () => renderBoards('pace');
  el('boards-tab-eff').onclick = () => renderBoards('efficiency');
  el('boards-refresh').onclick = () => renderBoards(el('boards').dataset.tab || 'pace');
}

export function showLanding() {
  mode = 'landing';
  quitting = false;
  try { teardownRace(sim); } catch (err) { console.error(err); }
  sim.setRaceHooks({
    suppressPracticeLaps: false,
    lockCameraKeys: false,
    blockKeys: true,
    onCrossLine: null,
    onStep: null,
    onReset: null,
    hudExtra: null,
  });
  if (typeof sim.clearDriveKeys === 'function') sim.clearDriveKeys();
  el('landing').style.display = 'flex';
  el('race-lobby').style.display = 'none';
  el('landing-actions').style.display = 'flex';
  el('race-finish').style.display = 'none';
  el('boards').style.display = 'none';
  el('btn-exit-mode').style.display = 'none';
  el('btn-exit-mode').textContent = '← Menu';
  show('hud', false);
  show('help', false);
  show('mapwrap', false);
  show('tune', false);
  show('topen', false);
  show('dash', false);
  sim.setCam(0);
}

export async function enterPractice() {
  mode = 'practice';
  try { teardownRace(sim); } catch (err) { console.error(err); }
  el('landing').style.display = 'none';
  el('race-finish').style.display = 'none';
  el('btn-exit-mode').style.display = 'block';
  el('btn-exit-mode').textContent = '← Menu';
  show('hud', true);
  show('help', true);
  show('mapwrap', true);
  show('tune', false);
  show('topen', true);
  sim.setRaceHooks({ blockKeys: false, lockCameraKeys: false });
  sim.setCam(0);
  sim.setTune(false);
  await loadTrackById(DEFAULT_TRACK, sim);
  sim.resetLaps();
}

export async function enterRace(username) {
  mode = 'race';
  quitting = false;
  el('landing').style.display = 'none';
  el('race-finish').style.display = 'none';
  el('btn-exit-mode').style.display = 'block';
  el('btn-exit-mode').textContent = 'Save laps & quit';
  show('hud', true);
  show('help', false);
  show('mapwrap', false);
  show('tune', false);
  show('topen', false);
  sim.applyRacePack();
  sim.refreshSliders();
  await loadTrackById(DEFAULT_TRACK, sim);
  sim.setCam(1);
  initRace(sim, { username });
}

export function exitToLanding() {
  showLanding();
}

async function openRaceQuit() {
  if (quitting) return;
  quitting = true;
  const panel = el('race-finish');
  const title = el('race-finish-title');
  const msg = el('race-finish-msg');
  const btn = el('btn-race-return');
  title.textContent = 'Save laps & quit';
  msg.innerHTML = 'Saving…';
  btn.disabled = true;
  btn.textContent = 'Return to menu';
  panel.style.display = 'flex';

  const best = getSessionBest();
  if (!best || !best.valid) {
    msg.innerHTML =
      '<p>No valid laps this session — nothing saved.</p>' +
      '<p class="muted">Complete a clean lap (on track, under 65 mph), then quit again.</p>';
    btn.disabled = false;
    quitting = false;
    return;
  }

  try {
    const out = await submitRun(best);
    const rows = await fetchBoard(best.trackId || DEFAULT_TRACK);
    const pace = bestPacePerName(rows);
    const eff = bestEfficiencyPerName(rows);
    const pacePlace = placeOf(pace, best.name);
    const effPlace = best.effEligible ? placeOf(eff, best.name) : null;
    const where = out.storage === 'sheet' ? 'Google Sheet' : 'local only (no Sheet URL)';

    msg.innerHTML =
      `<div class="quit-stat"><span class="quit-label">Your best lap</span>` +
      `<span class="quit-value">${formatTime(best.timeSec)}</span>` +
      `<span class="muted">${Number(best.whUsed).toFixed(1)} Wh` +
      (best.effEligible ? '' : ' · pace only') +
      ` · saved to ${where}</span></div>` +
      `<div class="quit-stat"><span class="quit-label">Pace leaderboard</span>` +
      `<span class="quit-value">${formatPlace(pacePlace, pace.length)}</span></div>` +
      `<div class="quit-stat"><span class="quit-label">Efficiency leaderboard</span>` +
      `<span class="quit-value">${best.effEligible
        ? formatPlace(effPlace, eff.length)
        : 'n/a (avg under 35 mph)'}</span></div>`;
  } catch (err) {
    console.error(err);
    msg.innerHTML =
      `<p>Best lap <b>${formatTime(best.timeSec)}</b> · ${Number(best.whUsed).toFixed(1)} Wh</p>` +
      `<p class="muted">Couldn’t update leaderboard: ${escapeHtml(err.message || 'error')}</p>`;
  }
  btn.disabled = false;
  quitting = false;
}

async function openBoards() {
  el('boards').style.display = 'flex';
  renderBoards('pace');
}

async function renderBoards(tab) {
  el('boards').dataset.tab = tab;
  el('boards-tab-pace').classList.toggle('active', tab === 'pace');
  el('boards-tab-eff').classList.toggle('active', tab === 'efficiency');
  const body = el('boards-body');
  body.innerHTML = 'Loading…';
  try {
    const rows = await fetchBoard(DEFAULT_TRACK);
    const list = tab === 'pace' ? bestPacePerName(rows) : bestEfficiencyPerName(rows);
    if (!list.length) {
      body.innerHTML = '<p class="muted">No valid runs yet.</p>';
      return;
    }
    const head = tab === 'pace'
      ? '<tr><th>#</th><th>Name</th><th>Time</th><th>Wh</th></tr>'
      : '<tr><th>#</th><th>Name</th><th>Wh</th><th>Time</th></tr>';
    const cells = list.map((r, i) => (
      tab === 'pace'
        ? `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${formatTime(r.timeSec)}</td><td>${Number(r.whUsed).toFixed(1)}</td></tr>`
        : `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${Number(r.whUsed).toFixed(1)}</td><td>${formatTime(r.timeSec)}</td></tr>`
    )).join('');
    body.innerHTML = `<table>${head}${cells}</table>`;
  } catch (err) {
    console.error(err);
    body.innerHTML = `<p class="muted">Failed to load board: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
