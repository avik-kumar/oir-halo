/** Absolute URL so GitHub Pages project sites still find the CSV without a trailing slash. */
export const TRACK_CSV = new URL('../data/track.csv', import.meta.url).href;
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
