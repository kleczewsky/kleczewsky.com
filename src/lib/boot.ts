import { useSyncExternalStore } from "react";

export type Milestone = "start" | "tier" | "chunk" | "link" | "compiled" | "ready" | "lost";
export type Phase = "pending" | "off" | "active" | "exiting" | "done";

const ORDER: Milestone[] = ["start", "tier", "chunk", "link", "compiled", "ready"];

/** The chunk is most of the bytes and the link most of the wait. */
export const PROGRESS: Record<Milestone, number> = {
  start: 0.04,
  tier: 0.14,
  chunk: 0.52,
  link: 0.64,
  compiled: 0.9,
  ready: 1,
  lost: 1,
};

let milestone: Milestone = "start";
let phase: Phase = "pending";
const subs = new Set<() => void>();

function emit() {
  for (const fn of subs) fn();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function reach(next: Milestone) {
  if (milestone === "lost" || milestone === next) return;
  if (next !== "lost" && ORDER.indexOf(next) < ORDER.indexOf(milestone)) return;
  milestone = next;
  emit();
}

export function following(m: Milestone): Milestone {
  return ORDER[ORDER.indexOf(m) + 1] ?? m;
}

export function getMilestone(): Milestone {
  return milestone;
}

export function setPhase(next: Phase) {
  if (phase === next) return;
  phase = next;
  emit();
}

export function useMilestone(): Milestone {
  return useSyncExternalStore(subscribe, getMilestone, (): Milestone => "start");
}

export function useBootPhase(): Phase {
  return useSyncExternalStore(
    subscribe,
    () => phase,
    (): Phase => "pending",
  );
}
