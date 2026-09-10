import { useSyncExternalStore } from "react";

/* Plain module object with a subscription, read per frame by the
   scene. Production never mounts the debug panel, so the defaults
   below ARE the scene — copy a tuned panel value back here. */

export type DebugState = {
  /** Free camera. WASD to move, drag to look, R and F for up and down. */
  fly: boolean;
  /** Pin the pixel ratio instead of letting PerformanceMonitor drive it. */
  lockDpr: boolean;
  dpr: number;

  bloom: number;
  bloomThreshold: number;
  vignette: number;

  skyDim: number;
  sunElevation: number;
  sunAzimuth: number;
  turbidity: number;
  rayleigh: number;

  stars: number;

  /** Point-size scale, divided by distance. See the note in Beacons. */
  beaconSize: number;
  /** How many of the masts, tallest first, carry a light. */
  beaconCount: number;

  /** Street traffic: how fast a streak runs, and how hard it burns. */
  trafficSpeed: number;
  trafficGlow: number;
  trafficDensity: number;

  /** A firework volley: burst spread in units per second, and how long
   * the window lights sit dimmed behind it. */
  fireBurst: number;
  fireGlow: number;
  fireDim: number;

  /** The airship: altitude and hull length in world units, and its
   * cruise in units per second. */
  blimpAlt: number;
  blimpSize: number;
  blimpSpeed: number;

  /** Raised blinds: drop of the deepest bundle and slat spacing, both
   * in world units, and how hard the cove light strikes the lips. */
  blindDrop: number;
  blindPitch: number;
  blindLight: number;

  /** How far out the wordmark floats, and how large it is drawn. */
  markDepth: number;
  markScale: number;
  markGlow: number;
};

export const DEBUG: DebugState = {
  fly: false,
  lockDpr: false,
  dpr: 1,

  /* Threshold 0.76 admits only lit windows and obstruction lights —
     the whole list of things in frame meant to read as sources. */
  bloom: 0.16,
  bloomThreshold: 0.76,
  vignette: 1.1,

  /* Preetham zeroes the sun's intensity below about -2.31 degrees;
     one notch lower and the in-scattering term vanishes, taking the
     ridge the skyline reads against with it. */
  skyDim: 0.365,
  sunElevation: -2,
  sunAzimuth: -35,
  turbidity: 5,
  rayleigh: 3,

  stars: 4,

  beaconSize: 2600,
  beaconCount: 56,

  trafficSpeed: 38,
  trafficGlow: 2.44,
  trafficDensity: 0.55,

  fireBurst: 150,
  fireGlow: 400,
  fireDim: 0.74,

  blimpAlt: 230,
  blimpSize: 260,
  blimpSpeed: 22,

  blindDrop: 0.265,
  blindPitch: 0.034,
  blindLight: 0.55,

  /* Far enough out that downtown crosses the letters. */
  markDepth: -1670,
  markScale: 0.75,
  markGlow: 0.04,
};

const subs = new Set<() => void>();
let version = 0;
let snapshot: DebugState = { ...DEBUG };

function emit() {
  version += 1;
  snapshot = { ...DEBUG };
  for (const fn of subs) fn();
}

export function setDebug<K extends keyof DebugState>(key: K, value: DebugState[K]) {
  if (DEBUG[key] === value) return;
  DEBUG[key] = value;
  emit();
}

export function resetDebug(defaults: DebugState) {
  Object.assign(DEBUG, defaults);
  emit();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

/** A stable snapshot: identity changes only when a knob moves. */
export function useDebug(): DebugState {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

export function debugVersion() {
  return version;
}
