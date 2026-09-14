import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, Stats, type PerformanceMonitorApi } from "@react-three/drei";
import * as THREE from "three";
import type { Tier } from "../lib/tier";
import { useDebug } from "./knobs";
import { CAM_Z, EYE, FOV, RATIO_AREA } from "./scene/constants";
import Content from "./Content";
import { RenderLoop } from "./scene/RenderLoop";

export default function Scene({
  wordmarkPage,
  tier,
  shown,
  onReady,
  onLost,
}: {
  wordmarkPage: string | null;
  tier: Tier;
  shown: boolean;
  onReady: () => void;
  onLost: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const d = useDebug();
  const monitor = useRef<PerformanceMonitorApi | null>(null);

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

  // Pause offscreen without remounting the quality controller. Its settled
  // factor and fallback state belong to the scene, not each visit to the hero.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let onScreen = true;
    const sync = () => setRunning(onScreen && !document.hidden);
    const io = new IntersectionObserver(
      ([entry]) => {
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

  useEffect(() => {
    if (running) return;
    const api = monitor.current;
    if (!api) return;
    // Discard only partial timing samples, never the learned quality or
    // adjustment limit. The wall-clock pause is not a slow rendered frame.
    api.frames = [];
    api.averages = [];
    api.index = 0;
  }, [running]);

  return (
    <div className={`stage-gl${shown ? " stage-gl--ready" : ""}`} ref={host}>
      <Canvas
        frameloop="never"
        // This scene handles pointer coordinates itself. Scroll changes its
        // position, not its dimensions; measuring it would update the R3F
        // store and re-render scene subscribers after every scroll burst.
        resize={{ scroll: false }}
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
        <RenderLoop running={running} />
        {d.lockDpr ? null : (
          <PerformanceMonitor
            // Start crisp, then trade resolution for frame time only
            // when measured performance calls for it.
            // Keep this instance mounted across offscreen pauses.
            factor={Math.max(0, Math.min(1, (dpr - range.min) / (range.max - range.min || 1)))}
            // Both bounds sit below the refresh rate: a page keeping up
            // with 60Hz reports 59-point-something, so an upper bound
            // OF the refresh rate can never be crossed.
            bounds={(refresh) => [Math.min(refresh * 0.7, 45), Math.min(refresh * 0.92, 70)]}
            flipflops={3}
            onChange={(api) => {
              monitor.current = api;
              setWanted(Math.round((range.min + api.factor * (range.max - range.min)) * 4) / 4);
            }}
            // drei counts all adjustments, including consecutive inclines,
            // as "flipflops". Reaching the limit freezes the chosen quality;
            // it must not force a healthy renderer down to minimum resolution.
            onFallback={(api) => {
              monitor.current = api;
            }}
          />
        )}
        <Content
          wordmarkPage={wordmarkPage}
          tier={tier}
          shown={shown}
          onReady={onReady}
          onLost={onLost}
        />
      </Canvas>
      {import.meta.env.DEV ? <Stats className="glstat-panel" /> : null}
    </div>
  );
}
