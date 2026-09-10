import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Renderer counters, dev only. Published to the DOM because browser
 * tooling in an isolated world cannot see page globals. */
export function Counters() {
  const { gl } = useThree();
  const probe = useRef({ frames: 0, since: 0 });

  useEffect(() => {
    // three resets the counters at the start of every render(), and the
    // post chain does several per frame.
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
      delete document.documentElement.dataset.gl;
    };
  }, [gl]);

  useFrame((state) => {
    const p = probe.current;
    p.frames += 1;
    const now = state.clock.elapsedTime;
    if (now - p.since < 1) return;

    // Do NOT use useFrame's priority to order this after the render:
    // any subscriber above zero takes rendering over and the scene
    // silently stops drawing.
    document.documentElement.dataset.gl = [
      `calls:${Math.round(gl.info.render.calls / p.frames)}`,
      `tris:${Math.round(gl.info.render.triangles / p.frames)}`,
      `progs:${gl.info.programs?.length ?? 0}`,
      `geo:${gl.info.memory.geometries}`,
      `tex:${gl.info.memory.textures}`,
      `dpr:${gl.getPixelRatio().toFixed(2)}`,
    ].join(" ");

    gl.info.reset();
    p.frames = 0;
    p.since = now;
  });

  return null;
}
