import {
  RULES_MAX_MPH, SIM_VERSION, PACK_ID, efficiencyMaxLapSec, CAR,
} from './config.js';
import { getCurrentTrackId } from './tracks.js';

/** @typedef {'idle'|'timing'|'finished'|'invalid'} RacePhase */

let phase = /** @type {RacePhase} */ ('idle');
let username = '';
let eAtArm = 0;
let timeAtArm = 0;
let result = null;
/** Best / last valid laps this race session (kept across R / abort). */
let sessionBest = null;
let sessionLast = null;
let simRef = null;

export function getRacePhase() { return phase; }
export function getRaceResult() { return result; }
export function getSessionBest() { return sessionBest; }
export function getRaceUsername() { return username; }

export function initRace(sim, opts) {
  simRef = sim;
  username = (opts && opts.username) || '';
  sessionBest = null;
  sessionLast = null;
  resetRaceSession({ keepBest: false });
  sim.setRaceHooks({
    suppressPracticeLaps: true,
    lockCameraKeys: true,
    blockKeys: false,
    onCrossLine: handleCrossLine,
    onStep: handleStep,
    onReset: () => abortCurrentAttempt(),
    hudExtra: raceHudHtml,
  });
}

export function teardownRace(sim) {
  resetRaceSession({ keepBest: false });
  sessionBest = null;
  sessionLast = null;
  sim.setRaceHooks({
    suppressPracticeLaps: false,
    lockCameraKeys: false,
    onCrossLine: null,
    onStep: null,
    onReset: null,
    hudExtra: null,
  });
}

/** Abort / soft reset — keeps session best/last unless keepBest is false. */
export function resetRaceSession(opts) {
  const keepBest = !opts || opts.keepBest !== false;
  phase = 'idle';
  result = null;
  eAtArm = 0;
  timeAtArm = 0;
  if (!keepBest) {
    sessionBest = null;
    sessionLast = null;
  }
  if (simRef) {
    simRef.resetCar();
    if (keepBest && typeof simRef.resetCurrentLap === 'function') {
      simRef.resetCurrentLap();
    } else if (typeof simRef.resetLaps === 'function') {
      simRef.resetLaps();
    }
  }
}

/** R key: dump current attempt, keep best/last this session. */
export function abortCurrentAttempt() {
  resetRaceSession({ keepBest: true });
}

function handleStep() {
  if (!simRef || phase !== 'timing') return;
  const mph = simRef.car.u * 2.23694;
  if (simRef.car.off || mph >= RULES_MAX_MPH) {
    invalidate(simRef.car.off ? 'off track' : 'speed ≥ 65 mph');
  }
}

function handleCrossLine() {
  if (!simRef) return;

  if (phase === 'timing') {
    finishLap();
    return;
  }

  // No warmup — first S/F starts the clock; any later S/F after idle/finish/invalid starts the next lap
  phase = 'timing';
  timeAtArm = simRef.simT;
  eAtArm = simRef.car.E;
  result = null;
}

function invalidate(reason) {
  if (phase !== 'timing') return;
  phase = 'invalid';
  result = {
    valid: false,
    reason,
    timeSec: null,
    whUsed: null,
    effEligible: false,
  };
}

function finishLap() {
  if (phase !== 'timing') return;
  const timeSec = Math.max(0.001, simRef.simT - timeAtArm);
  const whUsed = Math.max(0, eAtArm - simRef.car.E);
  const T = simRef.T;
  const tmax = T ? efficiencyMaxLapSec(T.len) : Infinity;
  const effEligible = timeSec <= tmax;
  phase = 'finished';
  result = {
    valid: true,
    reason: null,
    timeSec,
    whUsed,
    effEligible,
    tmaxEff: tmax,
    trackId: getCurrentTrackId() || 'ozark',
    name: username,
    simVersion: SIM_VERSION,
    packId: PACK_ID,
  };
  sessionLast = { ...result };
  if (!sessionBest || timeSec < sessionBest.timeSec) {
    sessionBest = { ...result };
  }
}

function raceHudHtml() {
  const mph = Math.round(simRef.car.u * 2.23694);
  const T = simRef.T;
  const tmax = T ? efficiencyMaxLapSec(T.len) : 0;
  let status = '<span style="color:#ffe08a">Cross start/finish to START lap</span>';
  let clock = '–';
  if (phase === 'timing') {
    status = '<span style="color:#7dffa3">TIMING · VALID</span> — cross S/F to finish';
    clock = simRef.fmt(simRef.simT - timeAtArm);
  }
  if (phase === 'invalid') {
    status = `<span style="color:#ff6b6b">INVALID · ${result && result.reason ? result.reason : ''}</span> — R to retry`;
  }
  if (phase === 'finished' && result) {
    status = result.effEligible
      ? '<span style="color:#7dffa3">FINISHED · Pace + Efficiency</span> — Save laps & quit'
      : '<span style="color:#ffe08a">FINISHED · Pace only</span> — Save laps & quit';
    clock = simRef.fmt(result.timeSec);
  }
  const whNow = phase === 'timing'
    ? Math.max(0, eAtArm - simRef.car.E)
    : (result && result.whUsed != null ? result.whUsed : 0);
  const lastStr = sessionLast
    ? `${simRef.fmt(sessionLast.timeSec)} · ${Number(sessionLast.whUsed).toFixed(1)} Wh`
    : '–';
  const bestStr = sessionBest
    ? `${simRef.fmt(sessionBest.timeSec)} · ${Number(sessionBest.whUsed).toFixed(1)} Wh`
    : '–';
  return (
    `${status}<br>` +
    `Lap ${clock}` +
    (phase === 'timing' || phase === 'finished' ? ` · Wh ${Number(whNow).toFixed(1)}` : '') +
    `<br>Last ${lastStr}` +
    `<br>Best ${bestStr}` +
    `<br>SOC ${(simRef.car.E / CAR.capWh * 100).toFixed(1)}%` +
    (simRef.car.Pregen > 1 ? ` · regen ${Math.round(simRef.car.Pregen)} W` : '') +
    `<br><span style="opacity:.75">Efficiency cutoff ${simRef.fmt(tmax)} (35 mph avg)</span>` +
    (simRef.car.off ? '<br><span style="color:#ffb">off track</span>' : '') +
    (mph >= RULES_MAX_MPH ? '<br><span style="color:#ff6b6b">overspeed</span>' : '')
  );
}
