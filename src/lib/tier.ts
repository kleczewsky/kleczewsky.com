/* Runs before paint and sets data-tier on <html>: a = full scene,
   b = reduced, c = no WebGL, three.js chunk never requested. */

export type Tier = "a" | "b" | "c";

interface NetworkInformation {
  saveData?: boolean;
}

interface ProbeNavigator extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
}

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    // Release the context immediately; browsers cap how many can exist.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function probeTier(): Tier {
  if (typeof window === "undefined" || typeof document === "undefined") return "c";

  const nav = navigator as ProbeNavigator;

  // An explicit request for less motion or less data is a stated
  // preference, not a capability guess. It wins outright.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "c";
  if (nav.connection?.saveData) return "c";
  if (!hasWebGL2()) return "c";

  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (coarsePointer || memory <= 4 || cores <= 4) return "b";
  return "a";
}

export function applyTier(tier: Tier = probeTier()): Tier {
  document.documentElement.dataset.tier = tier;
  return tier;
}
