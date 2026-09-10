import { Suspense, lazy, useEffect, useState } from "react";
import { useTier } from "../lib/tier";
import { useDebug } from "./knobs";
import "./StageCanvas.css";

/* three.js is ~1MB and must never block first paint: the gradient
   below is what a visitor sees immediately, and it stays underneath
   the canvas for the whole session rather than being swapped out;
   the swap was a frame of bare ground between the two. */

const Scene = lazy(() => import("./Scene"));

/* The ternary has to wrap the lazy() call, not the JSX: wrapping only
   the render leaves the dynamic import reachable at module scope and
   Rollup still emits the chunk. */
const Panel = import.meta.env.DEV ? lazy(() => import("./Debug")) : null;

/** Progress at each real milestone. Nothing here is on a timer: the
 * bar moves when something has actually happened. */
const AT_TIER = 0.14;
const AT_CHUNK = 0.58;
const DONE = 1;

/** Fires once the lazily-imported chunk has mounted, which is the only
 * honest signal that the download and parse are behind us. */
function Mounted({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount]);
  return null;
}

function Loader({ progress, done }: { progress: number; done: boolean }) {
  return (
    <div className={`stage-load${done ? " stage-load--done" : ""}`} aria-hidden="true">
      <span className="stage-load-track">
        <span className="stage-load-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
    </div>
  );
}

/** Renderer counters and page load timings, dev only. drei's Stats
 * owns frame time; Scene publishes the rest to <html data-gl>. */
function Readout() {
  const [line, setLine] = useState("");
  const [page, setPage] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setLine(document.documentElement.dataset.gl ?? "");

      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      // Chrome only, and behind a flag in some builds; treat as optional.
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

      setPage(
        [
          paint ? `fcp:${Math.round(paint.startTime)}ms` : null,
          nav ? `dom:${Math.round(nav.domContentLoadedEventEnd)}ms` : null,
          mem ? `heap:${(mem.usedJSHeapSize / 1048576).toFixed(0)}MB` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glstat t-micro" aria-hidden="true">
      {(line || "scene idle").split(" ").map((pair) => (
        <span key={pair}>{pair}</span>
      ))}
      {page ? <span className="glstat-page">{page}</span> : null}
    </div>
  );
}

export default function Stage() {
  const tier = useTier();
  const [reached, setReached] = useState(0);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const d = useDebug();

  // The bar only ever moves forward, so it is the furthest milestone
  // reached against what the tier alone already tells us.
  const fromTier = tier === null ? 0 : tier === "c" ? DONE : AT_TIER;
  const progress = Math.max(reached, fromTier);

  // The wordmark handoff waits for the reveal. Fading the DOM heading
  // the moment its texture was built swapped a lit headline for a
  // canvas that had not drawn yet.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.scene = "ready";
    return () => {
      delete document.documentElement.dataset.scene;
    };
  }, [ready]);

  const gl = tier !== null && tier !== "c";

  return (
    <>
      <div className={`stage${d.fly ? " stage--fly" : ""}`} aria-hidden="true">
        {/* Tier C sees this and nothing else, so it is the same
            composition as the shader rather than a placeholder colour. */}
        <div className="stage-base" />

        {gl ? (
          <Suspense fallback={null}>
            <Mounted onMount={() => setReached((p) => Math.max(p, AT_CHUNK))} />
            <Scene
              tier={tier}
              onReady={() => {
                setReached(DONE);
                setReady(true);
              }}
              onLost={() => {
                setReady(false);
                setLost(true);
              }}
            />
          </Suspense>
        ) : null}

        {/* A lost context is not a load in progress: the bar stays
            down and the gradient carries the frame. */}
        {gl ? <Loader progress={progress} done={ready || lost} /> : null}
      </div>

      {/* Outside .stage: it opens a stacking context at --z-scene, and
          an overlay nested in it cannot rise above the page content. */}
      {import.meta.env.DEV ? <Readout /> : null}
      {Panel && gl ? (
        <Suspense fallback={null}>
          <Panel />
        </Suspense>
      ) : null}
    </>
  );
}
