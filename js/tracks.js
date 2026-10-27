import { TRACKS_JSON } from './config.js';

let catalog = null;
let currentId = null;

export function getCurrentTrackId() {
  return currentId;
}

export async function loadCatalog() {
  if (catalog) return catalog;
  const res = await fetch(TRACKS_JSON);
  if (!res.ok) throw new Error(`Failed to load tracks.json (${res.status})`);
  catalog = await res.json();
  return catalog;
}

export function fillTrackSelect(selectEl, selectedId) {
  if (!selectEl || !catalog) return;
  selectEl.innerHTML = '';
  catalog.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.label;
    if (t.id === selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

export async function loadTrackById(id, sim) {
  const list = await loadCatalog();
  const entry = list.find((t) => t.id === id) || list[0];
  if (!entry) throw new Error('No tracks in catalog');
  const url = new URL(`../data/${entry.file}`, import.meta.url).href;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${entry.file} (${res.status})`);
  const text = await res.text();
  sim.loadRaw(sim.parseCSV(text), entry.label);
  currentId = entry.id;
  return entry;
}
