import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Keep one timeline across visibility changes. Changing R3F's frameloop
 * mode resets its clock, which rewinds every time-driven scene object. */
export function RenderLoop({ running }: { running: boolean }) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      const delta = previous === null ? 0 : Math.min((now - previous) / 1000, 0.1);
      previous = now;
      // advance() expects seconds in manual mode. Hidden time is excluded.
      advance(clock.elapsedTime + delta);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, advance, clock]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const tick = (event: Event) => {
      const step = (event as CustomEvent<{ step?: number }>).detail?.step ?? 100;
      advance(clock.elapsedTime + step / 1000);
    };
    document.addEventListener("stage:tick", tick);
    return () => document.removeEventListener("stage:tick", tick);
  }, [advance, clock]);

  return null;
}
