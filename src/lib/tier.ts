import { useEffect, useState } from "react";

/* Runs before paint and sets data-tier on <html>: a = full scene,
   b = reduced, c = no WebGL, three.js chunk never requested. */

export type Tier = "a" | "b" | "c";

interface ProbeNavigator extends Navigator {
  connection?: { saveData?: boolean };
}

type Verdict = { gpu: string; strikes: number; at: number };

const STORE = "kleczewsky:tier";

/** Seconds after the reveal before frames count, then seconds sampled. */
export const GAUGE_SKIP = 1.5;
export const GAUGE_SPAN = 2;

/** Median frame time in ms. Past HOPELESS_MS one load demotes; past
 * SLOW_MS it takes STRIKES loads in a row, so a single hitch cannot. */
const SLOW_MS = 22;
const HOPELESS_MS = 40;
const STRIKES = 2;
const TTL = 14 * 864e5;

let gpu = "";
let measuring = false;

function context(attrs?: WebGLContextAttributes) {
  return document
    .createElement("canvas")
    .getContext("webgl2", attrs) as WebGL2RenderingContext | null;
}

function probeGpu(): string | null {
  try {
    let gl = context({ failIfMajorPerformanceCaveat: true });
    const software = !gl;
    gl ??= context();
    if (!gl) return null;

    // RENDERER first: Firefox already buckets the real GPU into it and
    // warns when the debug extension is touched. Chrome and Safari mask it.
    let name = String(gl.getParameter(gl.RENDERER) ?? "");
    if (/^webkit webgl$/i.test(name)) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? name);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    return software || /swiftshader|llvmpipe|softpipe|basic render/i.test(name) ? null : name;
  } catch {
    return null;
  }
}

function readVerdict(): Verdict | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null") as Verdict | null;
    return v && v.gpu === gpu && Date.now() - v.at < TTL ? v : null;
  } catch {
    return null;
  }
}

function writeVerdict(strikes: number) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ gpu, strikes, at: Date.now() }));
  } catch {
    /* private mode: every load measures afresh */
  }
}

export function probeTier(): Tier {
  if (typeof window === "undefined" || typeof document === "undefined") return "c";

  const param = new URLSearchParams(location.search).get("tier");
  const forced = param === "a" || param === "b" || param === "c" ? param : null;
  const nav = navigator as ProbeNavigator;

  // An explicit request for less motion or less data is a stated
  // preference, not a capability guess. It wins outright.
  if (!forced && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "c";
  if (!forced && nav.connection?.saveData) return "c";

  const found = probeGpu();
  if (found === null) return "c";
  gpu = found;
  if (forced) return forced;

  // No hardware guess survives the browsers: Brave randomises the core
  // count, Safari caps it, Firefox reports 2 or physical cores, and Brave
  // and Safari mask the GPU. Frames measured on this machine decide.
  if ((readVerdict()?.strikes ?? 0) >= STRIKES) return "b";
  measuring = true;
  return "a";
}

/** Frame deltas in seconds, from a tier A load that was not forced. */
export function judgeFrames(deltas: number[]) {
  if (!measuring || deltas.length < 10) return;
  measuring = false;
  const sorted = deltas.toSorted((x, y) => x - y);
  const median = (sorted[sorted.length >> 1] ?? 0) * 1000;
  const strikes = readVerdict()?.strikes ?? 0;
  writeVerdict(median > HOPELESS_MS ? STRIKES : median > SLOW_MS ? strikes + 1 : 0);
}

export function applyTier(tier: Tier = probeTier()): Tier {
  document.documentElement.dataset.tier = tier;
  return tier;
}

export function readTier(): Tier {
  return (document.documentElement.dataset.tier as Tier) ?? "c";
}

/** Input modality, not capability: a flagship phone is coarse-pointer
 * and tier A both. */
export function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Null until after hydration. The flag is written to <html> before
 * React boots, so reading it during render would make the server and
 * client disagree on the first pass. */
export function useTier(): Tier | null {
  const [tier, setTier] = useState<Tier | null>(null);
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => setTier(readTier()), []);
  return tier;
}
