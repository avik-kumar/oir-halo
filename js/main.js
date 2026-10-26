import { TRACK_CSV, TRACK_LABEL_DEFAULT } from './config.js';

function showBootError(err) {
  console.error(err);
  const msg = err && err.message ? err.message : String(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre id="boot-error" style="position:fixed;inset:12px;overflow:auto;color:#fff;background:rgba(120,0,0,.92);padding:12px;z-index:99;font:13px/1.4 monospace;white-space:pre-wrap">${msg}</pre>`,
  );
}

async function boot() {
  const sim = await import('./sim.js');
  const {
    parseCSV,
    loadRaw,
    mockOval,
    setTrack,
    initMinimap,
    bindUI,
    setTune,
    frame,
  } = sim;

  async function loadDefaultTrack() {
    try {
      const res = await fetch(TRACK_CSV);
      if (!res.ok) throw new Error(`Failed to load ${TRACK_CSV} (${res.status})`);
      loadRaw(parseCSV(await res.text()), TRACK_LABEL_DEFAULT);
    } catch (err) {
      console.error(err);
      try {
        setTrack(mockOval(), 'Mock oval (track failed to load)');
      } catch (e2) {
        throw e2;
      }
    }
  }

  initMinimap();
  bindUI();
  setTune(false);
  await loadDefaultTrack();
  requestAnimationFrame(frame);
}

boot().catch(showBootError);
