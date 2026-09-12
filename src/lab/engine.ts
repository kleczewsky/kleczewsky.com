import type { ExperimentKind } from "./copy";
import type { ParticlePhysics } from "./particles";
import { particleToy, mirrorToy, breakerToy } from "./toys";
import { chromeToy } from "./chrome";
import { foundryToy } from "./foundry";
import { advanceGame, hitGame, newGame, targetWidth, TAU, type GameState } from "./game";

export type Instrument = ReturnType<typeof createInstrument>;

export function createInstrument(
  canvas: HTMLCanvasElement,
  kind: ExperimentKind,
  report: (game: GameState) => void,
) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  const context = ctx;
  let width = 1;
  let height = 1;
  let time = 0;
  let parameter = 0.42;
  let pointer = { x: 0.5, y: 0.5 };
  let game = newGame();
  let pulse = -10;
  let active = false;
  let held = false;
  const toy =
    kind === "orbit"
      ? particleToy(context)
      : kind === "chrome"
        ? chromeToy(context)
        : kind === "foundry"
          ? foundryToy(context)
          : kind === "mirror"
            ? mirrorToy(context)
            : kind === "breaker"
              ? breakerToy(context, report)
              : null;
  let backdrop: CanvasGradient;
  function circle(x: number, y: number, radius: number, color: string, stroke = 1) {
    context.beginPath();
    context.arc(x, y, Math.max(0, radius), 0, TAU);
    context.strokeStyle = color;
    context.lineWidth = stroke;
    context.stroke();
  }

  function grid() {
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#282529";
    for (let x = 24; x < width; x += 32) {
      for (let y = 24; y < height; y += 32) context.fillRect(x, y, 1, 1);
    }
    context.strokeStyle = "#30272b";
    context.lineWidth = 1;
    context.beginPath();
    const cx = width / 2;
    const cy = height / 2;
    context.moveTo(cx - 8, cy);
    context.lineTo(cx + 8, cy);
    context.moveTo(cx, cy - 8);
    context.lineTo(cx, cy + 8);
    context.stroke();
  }

  function drawLock() {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width * 0.31, height * 0.32);
    circle(cx, cy, radius + 32, "#292326");
    circle(cx, cy, radius - 32, "#292326");
    circle(cx, cy, radius, "#403036", 2);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const r = radius + 23;
      context.beginPath();
      context.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      context.lineTo(
        cx + Math.cos(a) * (r + (i % 5 === 0 ? 9 : 4)),
        cy + Math.sin(a) * (r + (i % 5 === 0 ? 9 : 4)),
      );
      context.strokeStyle = i % 5 === 0 ? "#817177" : "#392e33";
      context.lineWidth = 1;
      context.stroke();
    }
    context.beginPath();
    context.arc(
      cx,
      cy,
      radius,
      game.target - targetWidth(game.score) / 2,
      game.target + targetWidth(game.score) / 2,
    );
    context.strokeStyle = "#ff244c";
    context.lineWidth = 15;
    context.stroke();
    const angle = game.angle;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * (radius - 17), cy + Math.sin(angle) * (radius - 17));
    context.lineTo(cx + Math.cos(angle) * (radius + 17), cy + Math.sin(angle) * (radius + 17));
    context.strokeStyle = game.status === "miss" ? "#ff244c" : "#fff1f0";
    context.lineWidth = 4;
    context.stroke();
    const age = time - pulse;
    if (age < 0.7)
      circle(cx, cy, radius + age * 80, `rgba(255,100,122,${0.5 * (1 - age / 0.7)})`, 2);
  }

  function draw(dt = 0) {
    time += dt;
    advanceGame(game, dt);
    grid();
    if (toy) toy.draw(dt, pointer.x, pointer.y, parameter, active, held);
    else drawLock();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    backdrop = context.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.62,
    );
    backdrop.addColorStop(0, "#1c0c13");
    backdrop.addColorStop(0.58, "#0c0c0e");
    backdrop.addColorStop(1, "#080a0b");
    toy?.resize(width, height);
    draw();
  }

  return {
    draw,
    resize,
    press(value: boolean) {
      held = value;
    },
    leave() {
      active = false;
      held = false;
    },
    move(x: number, y: number) {
      active = true;
      pointer = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    },
    adjust(value: number) {
      parameter = value;
    },
    form(index: number) {
      toy?.form?.(index);
    },
    physics(value: ParticlePhysics) {
      toy?.physics?.(value);
    },
    text(value: string) {
      toy?.text?.(value);
      draw();
    },
    dispose() {
      toy?.dispose?.();
    },
    action() {
      pulse = time;
      toy?.action(pointer.x, pointer.y);
      if (kind === "lock") {
        game = hitGame(game);
        report({ ...game });
      }
      draw();
    },
    reset() {
      time = 0;
      pulse = -10;
      pointer = { x: 0.5, y: 0.5 };
      active = false;
      held = false;
      toy?.reset();
      game = newGame();
      report({ ...game });
      draw();
    },
  };
}
