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
  sunElevation: -2.3,
  sunAzimuth: -1,
  turbidity: 13,
  rayleigh: 1.2,

  stars: 2,

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
