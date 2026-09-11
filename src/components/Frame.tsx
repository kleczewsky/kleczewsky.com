import { useEffect } from "react";
import "./Frame.css";

/** Crosshair ticks scattered on the field, as registration marks. */
const MARKS: [number, number][] = [
  [12, 22],
  [88, 34],
  [26, 61],
  [72, 78],
  [46, 15],
  [93, 88],
];

/* dvh alone is not enough: some mobile browsers only recompute it once
   the address-bar animation settles, the same lag as plain vh. The
   visualViewport fires on the animation itself, so the custom property
   it drives stays live through the whole gesture, and CSS falls back
   to dvh for browsers without it. */
function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    const sync = () =>
      document.documentElement.style.setProperty("--vvh", `${vv?.height ?? window.innerHeight}px`);
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
}

export default function Frame() {
  useVisualViewportHeight();

  return (
    <div className="frame" aria-hidden="true">
      {MARKS.map(([x, y]) => (
        <span key={`${x}-${y}`} className="frame-mark" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
  );
}
