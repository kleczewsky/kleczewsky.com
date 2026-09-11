import { useEffect, useRef, type CSSProperties } from "react";
import { useLocale } from "../lib/locale";
import {
  PROGRESS,
  following,
  getMilestone,
  setPhase,
  useBootPhase,
  useMilestone,
} from "../lib/boot";
import "./Boot.css";

const CELLS = 10;
const TICKS = 17;

/** Sazabi holds its loader about 5.5s regardless of readiness. This
 * gate lasts as long as the scene actually takes, inside these bounds. */
const MIN_SHOW = 1100;
const HOLD_FULL = 320;
const CAP = 4500;
/** The background fade in Boot.css: 240ms delay plus 520ms. */
const EXIT = 800;

/** The meter creeps toward the next milestone but never reaches it,
 * so a long shader link still moves without claiming a step early. */
const CREEP = 0.8;
const CREEP_MS = 900;
const EASE_MS = 140;

const SKIP = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export default function Boot() {
  const { t } = useLocale();
  const phase = useBootPhase();
  const milestone = useMilestone();
  const root = useRef<HTMLDivElement>(null);
  const percent = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    // "live" too: StrictMode mounts this effect twice.
    if (!el || (html.dataset.boot !== "on" && html.dataset.boot !== "live")) {
      setPhase("off");
      return;
    }

    html.dataset.boot = "live";
    setPhase("active");

    const cells = [...el.querySelectorAll<HTMLElement>(".boot-cell")];
    const start = performance.now();
    let shown = 0;
    let lit = -1;
    let last = getMilestone();
    let since = start;
    let prev = start;
    let fullAt = 0;
    let raf = 0;
    let unmount = 0;
    let gone = false;

    const paint = () => {
      el.style.setProperty("--p", shown.toFixed(4));
      if (percent.current) percent.current.textContent = `${Math.round(shown * 100)}%`;
      const n = Math.floor(shown * CELLS + 1e-6);
      if (n === lit) return;
      lit = n;
      cells.forEach((cell, i) => cell.toggleAttribute("data-on", i < n));
    };

    const exit = () => {
      if (gone) return;
      gone = true;
      cancelAnimationFrame(raf);
      for (const type of SKIP) window.removeEventListener(type, exit);
      html.dataset.boot = "exit";
      setPhase("exiting");
      unmount = window.setTimeout(() => setPhase("done"), EXIT);
    };

    const frame = (now: number) => {
      const m = getMilestone();
      if (m !== last) {
        last = m;
        since = now;
      }

      const from = PROGRESS[m];
      const to = PROGRESS[following(m)];
      const target = from + (to - from) * CREEP * (1 - Math.exp(-(now - since) / CREEP_MS));
      shown += (Math.max(target, shown) - shown) * (1 - Math.exp(-(now - prev) / EASE_MS));
      prev = now;

      if (m === "ready" && shown > 0.995) {
        shown = 1;
        fullAt ||= now;
      }
      paint();

      const held = now - start >= MIN_SHOW;
      if (held && (m === "lost" || (fullAt && now - fullAt >= HOLD_FULL))) {
        exit();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const cap = window.setTimeout(exit, CAP);
    for (const type of SKIP) window.addEventListener(type, exit, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(cap);
      window.clearTimeout(unmount);
      for (const type of SKIP) window.removeEventListener(type, exit);
    };
  }, []);

  if (phase === "off" || phase === "done") return null;

  return (
    <div className="boot" ref={root} aria-hidden="true">
      <div className="boot-bg" />
      <div className="boot-content">
        <span className="boot-signal" />
        <img className="boot-mark" src="/favicon.svg" width="28" height="28" alt="" />

        <p className="boot-title">
          {t.boot.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>

        <div className="boot-meter">
          <span className="boot-corner boot-corner--tl" />
          <span className="boot-corner boot-corner--tr" />
          <span className="boot-corner boot-corner--bl" />
          <span className="boot-corner boot-corner--br" />
          <div className="boot-cells">
            {Array.from({ length: CELLS }, (_, i) => (
              <span key={i} className="boot-cell" />
            ))}
          </div>
          <div className="boot-caret">
            <span className="boot-caret-tip" />
            <span className="boot-percent" ref={percent}>
              0%
            </span>
          </div>
        </div>

        <div className="boot-foot">
          <p className="t-label boot-stage">
            <span key={milestone}>{t.boot.stages[milestone]}</span>
          </p>
          <p className="t-micro boot-skip">
            <span className="boot-skip-key">{t.boot.skip}</span>
            <span className="boot-skip-tap">{t.boot.skipTouch}</span>
          </p>
          <span className="boot-ticks">
            {Array.from({ length: TICKS }, (_, i) => (
              <span key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
