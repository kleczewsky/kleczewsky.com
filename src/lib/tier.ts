import { useEffect, useState } from "react";

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

  const cores = nav.hardwareConcurrency ?? 4;
  const coarsePointer = isCoarsePointer();

  // deviceMemory is not read here: Chrome caps and quantizes it hard
  // on public origins (max bucket 8, often lower) while reporting the
  // real value on localhost, so it made every desktop visitor to the
  // deployed site read as low-memory regardless of actual hardware.
  //
  // hardwareConcurrency gets the same treatment on Android specifically:
  // Chrome flattens it to a small fixed number there as a fingerprinting
  // mitigation, a Pixel 7 Pro's real 8 cores included, so it carries no
  // signal on a coarse pointer device. Trust it only on desktop, where
  // it still varies with the real machine.
  if (!coarsePointer && cores <= 4) return "b";
  return "a";
}

export function applyTier(tier: Tier = probeTier()): Tier {
  document.documentElement.dataset.tier = tier;
  return tier;
}

export function readTier(): Tier {
  return (document.documentElement.dataset.tier as Tier) ?? "c";
}

/** Input modality, not capability: a flagship phone is coarse-pointer
 * and tier A both. Callers that care whether the pointer moves
 * continuously (mouse) or only on contact (touch) read this instead
 * of overloading tier for it. */
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
