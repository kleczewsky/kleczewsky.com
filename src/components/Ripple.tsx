import { useEffect, useRef } from "react";
import { useTier } from "../lib/tier";
import "./Ripple.css";

/** CSS px per simulated cell. */
const SAMPLE = 4;
/** Display canvas resolution as a share of CSS px. The GPU smooths the upscale. */
const DISPLAY = 0.5;
/** The field advances at a fixed rate whatever the display refreshes at. */
const STEP = 1000 / 60;
/** Wave speed squared, in cells per step. The scheme is stable below 0.5. */
const SPEED2 = 0.22;
/** Share of a wave kept per step. Lower dies out closer to the pointer. */
const DAMP = 0.985;
/** Height added per px of pointer travel, and the ceiling per event. */
const PUSH = 1.2;
const MAX_PUSH = 48;
/** Total field energy under which the loop sleeps. */
const REST = 1;

export default function Ripple() {
  const tier = useTier();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const field = canvas?.parentElement;
    const host = document.documentElement;
    const ctx = canvas?.getContext("2d");
    const sim = document.createElement("canvas");
    const simCtx = sim.getContext("2d");
    if (!canvas || !field || !host || !ctx || !simCtx || tier === null || tier === "c") return;

    const [r = 255, g = 0, b = 39] = (getComputedStyle(field).color.match(/\d+/g) ?? []).map(
      Number,
    );
    let cols = 0;
    let rows = 0;
    let sample = SAMPLE;
    let cur = new Float32Array(0);
    let prev = new Float32Array(0);
    let image: ImageData | null = null;
    let raf = 0;
    let visible = false;
    let lastX = -1;
    let lastY = -1;
    let acc = 0;
    let before = 0;
    let energy = 0;
    let lastInput = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const { width, height } = bounds;
      const hero = document.querySelector(".home-hero") ?? document.querySelector(".stage");
      const start = hero ? Math.max(0, hero.getBoundingClientRect().bottom - bounds.top) : 0;
      field.style.setProperty("--ripple-start", `${start}px`);
      // A document-sized surface scrolls with the content. Bound the
      // simulation grid so long pages do not multiply the CPU budget.
      sample = Math.max(SAMPLE, Math.ceil(Math.sqrt((width * height) / 100_000)));
      cols = Math.max(3, Math.ceil(width / sample));
      rows = Math.max(3, Math.ceil(height / sample));
      sim.width = cols;
      sim.height = rows;
      canvas.width = Math.round(cols * sample * DISPLAY);
      canvas.height = Math.round(rows * sample * DISPLAY);
      canvas.style.width = `${cols * sample}px`;
      canvas.style.height = `${rows * sample}px`;
      ctx.imageSmoothingQuality = "high";
      cur = new Float32Array(cols * rows);
      prev = new Float32Array(cols * rows);
      image = simCtx.createImageData(cols, rows);
      lastX = -1;
      energy = 0;
      const d = image.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
    };

    const step = () => {
      energy = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const sum =
            (cur[i - 1] ?? 0) + (cur[i + 1] ?? 0) + (cur[i - cols] ?? 0) + (cur[i + cols] ?? 0);
          const c = cur[i] ?? 0;
          // Dampen velocity, not displacement: damping the entire height
          // creates a spring at every cell and pins the wake to the cursor.
          const edge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
          const damping = DAMP * Math.min(1, 0.8 + edge * 0.025);
          const v = c + (c - (prev[i] ?? 0)) * damping + SPEED2 * (sum - 4 * c);
          prev[i] = v;
          energy += Math.abs(v);
        }
      }
      [cur, prev] = [prev, cur];
    };

    const frame = (now: number) => {
      if (!image) return;
      acc += before ? Math.min(100, now - before) : STEP;
      before = now;
      for (let n = 0; acc >= STEP && n < 4; n++) {
        step();
        acc -= STEP;
      }
      acc = Math.min(acc, STEP);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (energy < REST || now - lastInput > 4000) {
        cur.fill(0);
        prev.fill(0);
        raf = 0;
        before = 0;
        acc = 0;
        return;
      }

      const d = image.data;
      // Light the slope of the surface. Opposite sides of a crest catch
      // different amounts of light, so the wake has depth instead of a fill.
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const dx = (cur[i + 1] ?? 0) - (cur[i - 1] ?? 0);
          const dy = (cur[i + cols] ?? 0) - (cur[i - cols] ?? 0);
          const light = Math.max(0, dx * -0.6 + dy * -0.8);
          const rim = Math.hypot(dx, dy) * 0.12;
          d[i * 4 + 3] = Math.min(0.42, (light + rim) * 0.2) * 255;
        }
      }
      simCtx.putImageData(image, 0, 0);
      ctx.globalAlpha = Math.min(1, Math.max(0, (4000 - (now - lastInput)) / 1200));
      ctx.drawImage(sim, 0, 0, canvas.width, canvas.height);
      raf = visible ? requestAnimationFrame(frame) : 0;
      if (!raf) before = 0;
    };

    const nudge = (gx: number, gy: number, amount: number) => {
      for (let oy = -3; oy <= 3; oy++) {
        for (let ox = -3; ox <= 3; ox++) {
          const x = gx + ox;
          const y = gy + oy;
          if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
          const i = y * cols + x;
          const share = Math.exp(-(ox * ox + oy * oy) / 4) * 0.16;
          cur[i] = (cur[i] ?? 0) + amount * share;
          prev[i] = (prev[i] ?? 0) + amount * share;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!visible || document.hidden || motion.matches || e.pointerType === "touch") return;
      const box = field.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;

      if (lastX >= 0) {
        const dist = Math.hypot(x - lastX, y - lastY);
        const push = Math.min(MAX_PUSH, dist * PUSH);
        const steps = Math.max(1, Math.ceil(dist / sample));
        for (let s = 1; s <= steps; s++) {
          nudge(
            Math.floor((lastX + ((x - lastX) * s) / steps) / sample),
            Math.floor((lastY + ((y - lastY) * s) / steps) / sample),
            push / steps,
          );
        }
      }

      lastX = x;
      lastY = y;
      lastInput = performance.now();
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const onLeave = () => {
      lastX = -1;
    };

    const reset = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      before = 0;
      acc = 0;
      lastX = -1;
      cur.fill(0);
      prev.fill(0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (!visible) {
        reset();
      }
    });
    const ro = new ResizeObserver(resize);

    resize();
    io.observe(field);
    ro.observe(field);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", reset);
    motion.addEventListener("change", reset);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", reset);
      motion.removeEventListener("change", reset);
    };
  }, [tier]);

  return (
    <div className="ripple" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
