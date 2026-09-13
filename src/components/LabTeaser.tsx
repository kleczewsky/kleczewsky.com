import { useEffect, useRef, useState } from "react";
import { RouteLink, useLocale } from "../lib/locale";
import { createCloud, setCloudForm, stepCloud, updateCloudTargets } from "../lab/particles";
import "./LabTeaser.css";

export function LabTeaser() {
  const { locale, t } = useLocale();
  const polish = locale === "pl";
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const cloud = createCloud(1000, 1);
    setCloudForm(cloud, 1);
    const pointer = { x: 0.5, y: 0.5, active: false };
    const style = getComputedStyle(element);
    const colors = ["--primary", "--primary-hot", "--ink"].map((name) =>
      style.getPropertyValue(name).trim(),
    );
    let width = 1,
      height = 1,
      visible = false,
      frame = 0,
      previous = 0;
    const still = paused || reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = () => Math.min(height / 2.3, width / 3.25);
    function updateTargets(dt: number) {
      updateCloudTargets(cloud, dt, 0.3);
      // Keep a quiet outer field around the main loop.
      for (let i = 820; i < cloud.count; i++) {
        const seed = cloud.data[i * 8 + 7]!;
        const angle = i * 2.399963 + cloud.time * 0.012;
        const radius = 0.45 + seed * 0.95;
        cloud.targets[i * 3] = Math.cos(angle) * radius * cloud.aspect;
        cloud.targets[i * 3 + 1] = Math.sin(angle) * radius * 0.8 - 0.35;
        cloud.targets[i * 3 + 2] = 0;
      }
    }
    function paint(dt: number) {
      updateTargets(dt);
      if (dt) {
        const steps = Math.ceil(dt * 120);
        for (let i = 0; i < steps; i++) stepCloud(cloud, dt / steps, pointer, 0.6);
      }
      ctx!.clearRect(0, 0, width, height);
      for (let i = 0; i < cloud.count; i++) {
        const k = i * 8;
        const brightness = cloud.data[k + 6]!;
        ctx!.fillStyle = colors[i % colors.length]!;
        ctx!.globalAlpha = i < 820 ? 0.35 + brightness * 0.65 : 0.12 + brightness * 0.3;
        const size = 0.7 + brightness * 1.4;
        ctx!.fillRect(
          width / 2 + cloud.data[k]! * scale(),
          height / 2 + cloud.data[k + 1]! * scale(),
          size,
          size,
        );
      }
      ctx!.globalAlpha = 1;
    }
    function tick(now: number) {
      paint(previous ? Math.min((now - previous) / 1000, 0.04) : 0);
      previous = now;
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden && !still) frame = requestAnimationFrame(tick);
      else pointer.active = false;
    }
    const resize = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cloud.aspect = Math.max(1.05, width / height);
      updateTargets(0);
      for (let i = 0; i < cloud.count; i++) {
        for (let axis = 0; axis < 3; axis++) {
          cloud.data[i * 8 + axis] = cloud.targets[i * 3 + axis]!;
          cloud.data[i * 8 + axis + 3] = 0;
        }
      }
      paint(0);
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      sync();
    });
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.x = 0.5 + (event.clientX - bounds.left - width / 2) / (3.2 * scale() * cloud.aspect);
      pointer.y = 0.5 + (event.clientY - bounds.top - height / 2) / (3.2 * scale());
      pointer.active = !still;
    };
    const leave = () => {
      pointer.active = false;
    };
    resize.observe(element);
    observer.observe(element);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", move);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("pointerup", leave);
    element.addEventListener("pointercancel", leave);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", move);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("pointerup", leave);
      element.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused, reduced]);
  return (
    <div className="lab-teaser">
      <div className="lab-teaser-field">
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            polish
              ? "Czerwone i białe cząstki tworzą znak nieskończoności."
              : "Red and white particles forming an infinity symbol."
          }
        />
      </div>
      <div className="lab-teaser-center">
        <RouteLink to="lab" className="btn lab-teaser-link">
          {t.home.more} →
        </RouteLink>
      </div>
      {!reduced && (
        <button
          type="button"
          className="lab-teaser-pause t-micro"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? (polish ? "Wznów" : "Resume") : polish ? "Wstrzymaj" : "Pause"}
          <span aria-hidden="true">{paused ? " ▷" : " Ⅱ"}</span>
        </button>
      )}
    </div>
  );
}
