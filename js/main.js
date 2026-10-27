import { initMode, showLanding } from './mode.js';
import { loadTrackById } from './tracks.js';

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
    mockOval,
    setTrack,
    initMinimap,
    bindUI,
    frame,
  } = sim;

  initMinimap();
  bindUI();

  try {
    await loadTrackById('ozark', sim);
  } catch (err) {
    console.error(err);
    try {
      setTrack(mockOval(), 'Mock oval (track failed to load)');
    } catch (e2) {
      throw e2;
    }
  }

  initMode(sim);
  showLanding();
  requestAnimationFrame(frame);
}

boot().catch(showBootError);
