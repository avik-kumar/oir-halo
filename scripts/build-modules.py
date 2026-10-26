"""Generate ES modules from js/_legacy.js (run after extract-js.py)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
legacy = (ROOT / "js" / "_legacy.js").read_text(encoding="utf-8")

# Drop CAR/DEFAULTS/P/SP block (moved to config.js)
start = legacy.find("// ====================== SCENE ======================")
if start < 0:
    raise SystemExit("scene marker not found")
body = legacy[start:]

# Drop boot block at end
boot = body.rfind("try{ loadRaw(parseCSV(EMBEDDED_TRACK)")
if boot > 0:
    body = body[:boot]

config_js = '''/** @typedef {typeof import('./config.js')} Config */
export const TRACK_CSV = 'data/track.csv';
export const TRACK_LABEL_DEFAULT = 'Ozark International Raceway';
export const TRACK_WIDTH = 12;
export const RULES_MAX_MPH = 65;
export const G = 9.8;

export const CAR = {
  Crr0: 0.002013333, Crr1: 5.04e-6, Crr2: 1.1232e-6,
  aeroA: 0.09180184, aeroB: 0.2856778,
  downC: 0.3556148, downD: 0.6192678,
  auxW: 24 * 3.5, vicor: 0.85,
  capWh: 5200, Rint: 0.0174 * (36 / 18) / (10 / 64), Rharn: 0.3, Vpack: 3.6 * 36,
  motorEff: 0.92, cellEff: 0.254, mppt: 0.90, area: 6,
  L: 2.6, h: 0.35, C: 1.45, E: -1.75, rearBias: 1.08,
};

export const DEFAULTS = { mass: 315, motorKW: 1.8, motors: 2, mu: 0.95, wf: 0.48, B: 9, irr: 750, elev: 1 };
export const P = { ...DEFAULTS };
export const SP = [
  ['mass', 'Mass (kg)', 200, 500, 5],
  ['motorKW', 'Power per motor (kW)', 1, 8, 0.1],
  ['motors', 'Number of motors', 1, 4, 1],
  ['mu', 'Tire grip μ', 0.5, 1.3, 0.05],
  ['wf', 'Front weight fraction', 0.35, 0.65, 0.01],
  ['B', 'Tire stiffness', 5, 14, 0.5],
  ['irr', 'Irradiance (W/m²)', 0, 1000, 25],
  ['elev', 'Terrain scale (rebuilds)', 0, 1.5, 0.1],
];
'''

sim_header = '''import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {
  TRACK_WIDTH, RULES_MAX_MPH, G, CAR, P, DEFAULTS, SP,
} from './config.js';

export let T = null;
export let trackGroup = null;
export let RAW = null;
export let RAWLABEL = '';
'''

# Remove duplicate declarations from body
for needle in [
    "let trackGroup = null;\n\n// ====================== TRACK ======================\nlet T = null;\n\n",
    "let trackGroup = null;\n",
    "// ====================== TRACK ======================\nlet T = null;\n\n",
]:
    if needle in body:
        body = body.replace(needle, "// ====================== TRACK ======================\n\n", 1)
        break

body = body.replace("let RAW=null, RAWLABEL='';\n", "")
body = body.replace("let simT=0", "export let simT=0")
body = body.replace("let lapStart=null", "export let lapStart=null")
body = body.replace("let halfway=false", "export let halfway=false")
body = body.replace("let lastLap=null", "export let lastLap=null")
body = body.replace("let bestLap=null", "export let bestLap=null")
body = body.replace("let lapCount=0", "export let lapCount=0")
body = body.replace("let camMode=0", "export let camMode=0")
body = body.replace("let camYaw=0", "export let camYaw=0")
body = body.replace("let lookYaw=0", "export let lookYaw=0")
body = body.replace("let mapT=null", "export let mapT=null")

exports_footer = '''
export {
  renderer, scene, camera, car3d, carFrontWheels, carSpin, shadow,
  smooth, buildFromXYZ, parseCSV, mockOval, loadRaw, setTrack, sample,
  resetCar, step, resetLaps, crossLine, hud, setCam, setTune, buildMap, drawMap,
  frame, bindUI, initMinimap,
};
'''

# bindUI: extract slider setup - we'll wrap in function in main
# initMinimap: map canvas setup lines

# Split UI init: move map init to export function
map_init = """const mapEl=document.getElementById('map'), mctx=mapEl.getContext('2d'), MS=220, dpr=window.devicePixelRatio||1;
mapEl.width=MS*dpr; mapEl.height=MS*dpr; mapEl.style.width=MS+'px'; mapEl.style.height=MS+'px'; mctx.scale(dpr,dpr);
"""
if map_init in body:
    body = body.replace(
        map_init,
        "let mapEl, mctx, MS=220;\nexport function initMinimap(){\n"
        + map_init.replace("const mapEl", "mapEl").replace("const mctx", "mctx").replace("const MS", "MS")
        + "}\n",
        1,
    )

# Wrap slider UI in bindUI
ui_start = "const box=document.getElementById('sliders');"
ui_end = "});"
idx = body.find(ui_start)
idx2 = body.find("addEventListener('dragover'", idx)
if idx >= 0 and idx2 > idx:
    ui_block = body[idx:idx2]
    body = body[:idx] + "export function bindUI(){\n" + ui_block + "}\n" + body[idx2:]

# Remove duplicate key listeners from bindUI - keep in bindUI
# KM listeners stay before bindUI in body - move into bindUI
km_start = "const KM={ArrowUp:'up'"
km_end = "document.getElementById('resetb').onclick"
kidx = body.find(km_start)
kidx2 = body.find(km_end, kidx)
if kidx >= 0 and kidx2 > kidx:
    km_block = body[kidx:kidx2]
    body = body[:kidx] + body[kidx2:]
    body = body.replace("export function bindUI(){", "export function bindUI(){\n" + km_block, 1)

sim_js = sim_header + body + exports_footer

(ROOT / "js" / "config.js").write_text(config_js, encoding="utf-8")
(ROOT / "js" / "sim.js").write_text(sim_js, encoding="utf-8")
print("wrote js/config.js and js/sim.js")
