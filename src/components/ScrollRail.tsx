import { useEffect, useRef } from "react";
import "./ScrollRail.css";

/** How long the bar stays out after the last scroll or pointer move. */
const LINGER = 900;

/** A thumb shorter than this is a dot, not a handle. */
const MIN_THUMB = 26;

/** And one longer than this is a bar: caps the thumb short of filling
 * the track on a short page. */
const MAX_THUMB = 0.34;

export default function ScrollRail() {
  const zone = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zoneEl = zone.current;
    const railEl = rail.current;
    const trackEl = track.current;
    const thumbEl = thumb.current;
    if (!zoneEl || !railEl || !trackEl || !thumbEl) return;

    const doc = document.documentElement;
    let idle = 0;
    let dragging = false;
    let hovering = false;
    let lit = false;

    /** Whether the compositor can drive the thumb itself. */
    const timeline = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");

    // scrollHeight/clientHeight force layout, so every read happens
    // here, once, not per scroll frame.
    let trackH = 0;
    let thumbH = MIN_THUMB;
    let travel = 0;
    let span = 0;

    const measure = () => {
      // The track, not the bar: the bar pads it away from its own
      // rounded ends, and the thumb travels inside the track.
      trackH = trackEl.clientHeight;
      span = doc.scrollHeight - window.innerHeight;

      const live = span > 4;
      zoneEl.classList.toggle("rail-zone--idle", !live);
      railEl.classList.toggle("rail--idle", !live);
      if (!live) return false;

      thumbH = Math.min(
        trackH * MAX_THUMB,
        Math.max(MIN_THUMB, (window.innerHeight / doc.scrollHeight) * trackH),
      );
      travel = trackH - thumbH;
      thumbEl.style.height = `${thumbH}px`;
      // The one number the CSS animation needs, written when the page
      // changes shape and at no other time.
      thumbEl.style.setProperty("--rail-travel", `${travel}px`);
      return true;
    };

    /** Fallback for browsers without scroll timelines. Runs on the main
     * thread, so it trails wherever that thread is busy. */
    const paint = () => {
      if (span <= 0) return;
      const t = Math.min(1, Math.max(0, window.scrollY / span));
      thumbEl.style.transform = `translate3d(0, ${t * travel}px, 0)`;
    };

    const wake = () => {
      if (!lit) {
        lit = true;
        railEl.classList.add("rail--live");
      }
      window.clearTimeout(idle);
      if (dragging || hovering) return;
      idle = window.setTimeout(() => {
        lit = false;
        railEl.classList.remove("rail--live");
      }, LINGER);
    };

    const onScroll = timeline
      ? wake
      : () => {
          paint();
          wake();
        };

    const onResize = () => {
      if (measure() && !timeline) paint();
    };

    const seek = (clientY: number) => {
      if (travel <= 0) return;
      const box = trackEl.getBoundingClientRect();
      const t = (clientY - box.top - thumbH / 2) / travel;
      window.scrollTo({ top: Math.min(1, Math.max(0, t)) * span, behavior: "instant" });
    };

    const onEnter = () => {
      hovering = true;
      wake();
    };

    const onLeave = () => {
      hovering = false;
      wake();
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      zoneEl.setPointerCapture(e.pointerId);
      railEl.classList.add("rail--held");
      wake();
      seek(e.clientY);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      seek(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      zoneEl.releasePointerCapture(e.pointerId);
      railEl.classList.remove("rail--held");
      wake();
    };

    measure();
    if (timeline) {
      // Tells the stylesheet the animation may take over. Until the
      // travel distance has been measured the keyframes would run to
      // an unset custom property, which is zero.
      railEl.classList.add("rail--timeline");
    } else {
      paint();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    zoneEl.addEventListener("pointerenter", onEnter);
    zoneEl.addEventListener("pointerleave", onLeave);
    zoneEl.addEventListener("pointerdown", onDown);
    zoneEl.addEventListener("pointermove", onMove);
    zoneEl.addEventListener("pointerup", onUp);
    zoneEl.addEventListener("pointercancel", onUp);

    // The page grows as routes change and as images land, and a thumb
    // sized against the old height is wrong without any scroll event
    // to correct it.
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);

    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      zoneEl.removeEventListener("pointerenter", onEnter);
      zoneEl.removeEventListener("pointerleave", onLeave);
      zoneEl.removeEventListener("pointerdown", onDown);
      zoneEl.removeEventListener("pointermove", onMove);
      zoneEl.removeEventListener("pointerup", onUp);
      zoneEl.removeEventListener("pointercancel", onUp);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <div className="rail-zone rail-zone--idle" ref={zone} aria-hidden="true" />

      <div className="rail rail--idle" ref={rail} aria-hidden="true">
        <div className="rail-body">
          <div className="rail-track" ref={track}>
            <div className="rail-thumb" ref={thumb} />
          </div>
        </div>

        <span className="rail-chamfer rail-chamfer--up" />
        <span className="rail-chamfer rail-chamfer--dn" />
      </div>
    </>
  );
}
