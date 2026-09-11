import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { GAUGE_SKIP, GAUGE_SPAN, judgeFrames } from "../../lib/tier";

export function Gauge({ active }: { active: RefObject<boolean> }) {
  const deltas = useRef<number[]>([]);
  const start = useRef(-1);
  const done = useRef(false);

  useFrame((state, dt) => {
    if (done.current || !active.current) return;
    const t = state.clock.elapsedTime;

    // A hidden tab or an off-screen canvas stops the loop, and the frame
    // after that gap is not a measurement. Start the window over.
    if (start.current < 0 || dt > 0.25) {
      start.current = t;
      deltas.current = [];
      return;
    }

    if (t - start.current < GAUGE_SKIP) return;
    deltas.current.push(dt);
    if (t - start.current < GAUGE_SKIP + GAUGE_SPAN) return;

    done.current = true;
    judgeFrames(deltas.current);
  });

  return null;
}
