import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, advance } from "@react-three/fiber";
import { PerformanceMonitor, Stats } from "@react-three/drei";
import * as THREE from "three";
import type { Tier } from "../lib/tier";
import { useDebug } from "./knobs";
import { CAM_Z, EYE, FOV, RATIO_AREA } from "./scene/constants";
import Content from "./Content";

export default function Scene({
  tier,
  shown,
  onReady,
  onLost,
}: {
  tier: Tier;
  shown: boolean;
  onReady: () => void;
  onLost: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const d = useDebug();

  // PerformanceMonitor drives the pixel ratio between these bounds:
  // a single ratio from the device tier is a guess, since the same
  // laptop on its own panel vs. a 4K display differs 4x in fragments.
  const base = tier === "a" ? { min: 1, max: 2 } : { min: 1, max: 1.5 };
  /** What the monitor last asked for, before the range is applied. */
  const [wanted, setWanted] = useState((base.min + base.max) / 2);

  // Cost is fragments, so both bounds follow the canvas, not the
  // device. Letterboxed to a band it is a quarter the area of a
  // full-height one, and a quarter the area buys twice the ratio at
  // the same cost. The floor matters more than the ceiling here: it is
  // what renders before a frame has been measured.
  const [area, setArea] = useState(0);
  const range = useMemo(() => {
    const gain = Math.max(1, Math.min(2, Math.sqrt(RATIO_AREA / Math.max(area, 1))));
    return { min: Math.min(2, base.min * gain), max: Math.min(2, base.max * gain) };
  }, [area, base.min, base.max]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setArea(entry.contentRect.width * entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clamped here rather than stored clamped: the monitor only moves the
  // ratio on its own schedule, so a resize would otherwise leave the
  // old range's value in place until the next incline.
  const dpr = Math.min(Math.max(wanted, range.min), range.max);

  // No scroll listener: the observer watches the stage element itself,
  // so it fires whatever height --scene-h gives it.
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let onScreen = true;
    const sync = () => setRunning(onScreen && !document.hidden);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "5% 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Hand crank for the render loop, dev only: rAF doesn't run in a
  // hidden page, so an automated check would otherwise only ever
  // screenshot a black canvas.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let t = performance.now();
    const tick = (e: Event) => {
      t += (e as CustomEvent<{ step?: number }>).detail?.step ?? 100;
      advance(t);
    };
    document.addEventListener("stage:tick", tick);
    return () => document.removeEventListener("stage:tick", tick);
  }, []);

  return (
    <div className={`stage-gl${shown ? " stage-gl--ready" : ""}`} ref={host}>
      <Canvas
        frameloop={running ? "always" : "never"}
        dpr={d.lockDpr ? d.dpr : dpr}
        /* Tier A resolves MSAA in the composer; tier B renders straight
           to the canvas and needs its own edge antialiasing. */
        gl={{
          antialias: tier === "b",
          powerPreference: "high-performance",
          /* Nothing here is tone mapped. Saying so keeps tier B, which has no
             composer, identical to tier A. */
          toneMapping: THREE.NoToneMapping,
        }}
        // Near plane is half the z-fighting fix: at 0.1 the far blocks
        // resolve to about 2.5 units. Nothing in the room is closer than 2.2.
        camera={{ fov: FOV, near: 0.6, far: 5600, position: [0, EYE, CAM_Z + 0.9] }}
      >
        {d.lockDpr ? null : (
          <PerformanceMonitor
            // Start crisp, then trade resolution for frame time only
            // when measured performance calls for it.
            factor={0.5}
            // Both bounds sit below the refresh rate: a page keeping up
            // with 60Hz reports 59-point-something, so an upper bound
            // OF the refresh rate can never be crossed.
            bounds={(refresh) => [Math.min(refresh * 0.7, 45), Math.min(refresh * 0.92, 70)]}
            flipflops={3}
            onChange={({ factor }) =>
              setWanted(Math.round((range.min + factor * (range.max - range.min)) * 4) / 4)
            }
            onFallback={() => setWanted(range.min)}
          />
        )}
        <Content tier={tier} shown={shown} onReady={onReady} onLost={onLost} />
      </Canvas>
      {import.meta.env.DEV ? <Stats className="glstat-panel" /> : null}
    </div>
  );
}
