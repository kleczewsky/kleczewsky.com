import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

/** Native fragment navigation can run before the client-rendered page exists. */
export default function SectionScroll() {
  const location = useLocation();
  const navigation = useNavigationType();

  useEffect(() => {
    const { hash } = location;
    if (!hash) {
      // In-app page links should open at the top, just like a fresh load.
      // Leave initial loads and browser history restoration to the browser.
      if (navigation === "PUSH") window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;

    let cancelled = false;
    const align = () => {
      if (!cancelled) target.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const frame = requestAnimationFrame(align);
    // Web fonts can change the height of every section above the destination.
    // Don't pull the reader back if they've already started moving around.
    const cancel = () => {
      cancelled = true;
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, cancel, { passive: true });
    if (document.fonts.status !== "loaded") void document.fonts.ready.then(align);

    return () => {
      cancel();
      cancelAnimationFrame(frame);
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, [location, navigation]);

  return null;
}
