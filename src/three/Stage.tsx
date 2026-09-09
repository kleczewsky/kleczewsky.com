import { Suspense, lazy, useEffect, useState } from "react";
import type { Tier } from "../lib/tier";
import "./StageCanvas.css";

/* three.js is ~1MB and must never block first paint: the CSS
   gradient below is what a visitor sees immediately (all they ever
   see, on tier C) until the tier probe clears the WebGL chunk. */

const Scene = lazy(() => import("./Scene"));

/* The ternary has to wrap the lazy() call, not the JSX: wrapping only
   the render leaves the dynamic import reachable at module scope and
   Rollup still emits the chunk. */
const Panel = import.meta.env.DEV ? lazy(() => import("./Debug")) : null;

const Fallback = () => <div className="stage stage--fallback" aria-hidden="true" />;

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
      // Chrome only, and behind a flag in some builds — treat as optional.
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
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    setTier((document.documentElement.dataset.tier as Tier) ?? "c");
  }, []);

  return (
    <>
      {tier === null || tier === "c" ? (
        <Fallback />
      ) : (
        <Suspense fallback={<Fallback />}>
          <Scene tier={tier} />
        </Suspense>
      )}
      {import.meta.env.DEV ? <Readout /> : null}
      {Panel && tier !== null && tier !== "c" ? (
        <Suspense fallback={null}>
          <Panel />
        </Suspense>
      ) : null}
    </>
  );
}
