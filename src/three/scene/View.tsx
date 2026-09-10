import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Tier } from "../../lib/tier";
import { CAM_Z, EYE } from "./constants";
import { damp } from "./math";
import { usePointer } from "./pointer";

/** `active` holds the opening move until the canvas is actually being
 * shown, so the settle plays into the reveal rather than finishing
 * behind a transparent canvas while the programs are still linking. */
export function View({ tier, active }: { tier: Tier; active: RefObject<boolean> }) {
  const { camera } = useThree();
  const pointer = usePointer();
  const intro = useRef(0);

  // R3F aims the default camera at the origin, which pitches it down
  // and puts the horizon off the top of the frame. Zero it once.
  useEffect(() => {
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // Clamp the step so a stall (a tab regaining focus, a long task)
    // cannot teleport anything on the frame after it.
    const step = Math.min(dt, 1 / 30);

    if (active.current) intro.current = Math.min(1, intro.current + step / 2.2);
    const settle = 1 - Math.pow(1 - intro.current, 4);

    // Two sine pairs at incommensurate rates, so the drift never
    // visibly repeats and never reaches a rest position you can catch
    // it sitting at.
    const driftX = Math.sin(t * 0.19) * 0.026 + Math.sin(t * 0.47 + 2.1) * 0.007;
    const driftY = Math.sin(t * 0.15 + 1.4) * 0.018 + Math.sin(t * 0.55) * 0.005;

    // Parallax is cut off tier A, where "pointer" is usually a stale
    // tap position rather than a hand moving over the scene.
    const par = tier === "a" ? 1 : 0.35;

    camera.position.x = damp(camera.position.x, pointer.x * 0.16 * par + driftX, 2.6, step);
    camera.position.y = damp(camera.position.y, EYE - pointer.y * 0.07 * par + driftY, 2.6, step);
    // The opening move is a single slow settle toward the glass. It is
    // the only travel in the whole scene.
    camera.position.z = damp(camera.position.z, CAM_Z + (1 - settle) * 0.9, 3.4, step);
  });

  return null;
}
