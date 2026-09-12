import { burstCloud, createCloud, setCloudForm, stepCloud, updateCloudTargets } from "./particles";
import type { ParticlePhysics } from "./particles";
import { brickRect, newBreaker, PADDLE_HALF, stepBreaker } from "./breaker";
import { newGame, type GameState } from "./game";

export interface Toy {
  resize(width: number, height: number): void;
  draw(dt: number, x: number, y: number, parameter: number, active: boolean, held: boolean): void;
  action(x: number, y: number): void;
  form?(index: number): void;
  physics?(value: ParticlePhysics): void;
  text?(value: string): void;
  dispose?(): void;
  reset(): void;
}

export function particleToy(ctx: CanvasRenderingContext2D): Toy {
  let width = 1,
    height = 1;
  let cloud = createCloud(0, 1);
  const colors = ["#fc476b", "#ffb1c1", "#fff8f5"];
  const glows = colors.map((color) => {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const paint = sprite.getContext("2d")!;
    const gradient = paint.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.12, color + "aa");
    gradient.addColorStop(0.35, color + "28");
    gradient.addColorStop(1, color + "00");
    paint.fillStyle = gradient;
    paint.fillRect(0, 0, 32, 32);
    return sprite;
  });
  const reset = () => {
    cloud = createCloud(width < 500 ? 2400 : 4200, width / height);
  };
  return {
    resize(w, h) {
      const previousAspect = cloud.aspect;
      width = w;
      height = h;
      if (!cloud.count) reset();
      else {
        cloud.aspect = width / height;
        for (let i = 0; i < cloud.data.length; i += 8) {
          cloud.data[i] = (cloud.data[i]! * cloud.aspect) / previousAspect;
          cloud.data[i + 3] = (cloud.data[i + 3]! * cloud.aspect) / previousAspect;
        }
      }
    },
    draw(dt, x, y, parameter, active, held) {
      updateCloudTargets(cloud, dt, parameter);
      const steps = Math.max(1, Math.ceil(dt * 120));
      for (let s = 0; s < steps; s++)
        stepCloud(cloud, dt / steps, { x, y, active }, held ? 1 : parameter);
      const p = cloud.data;
      const scale = height / 3.2;
      for (let group = 0; group < 3; group++) {
        ctx.fillStyle = colors[group]!;
        for (let i = group * 8; i < p.length; i += 24) {
          const depth = 3 / (3 + p[i + 2]! * 0.45);
          const px = width / 2 + p[i]! * scale * depth;
          const py = height / 2 + p[i + 1]! * scale * depth;
          const brightness = p[i + 6]!;
          const radius = (0.45 + brightness * brightness * 1.15) * depth;
          ctx.globalAlpha = 0.25 + brightness * 0.75;
          if (brightness > 0.965) {
            const size = radius * 9;
            ctx.drawImage(glows[group]!, px - size / 2, py - size / 2, size, size);
          }
          ctx.fillRect(px, py, radius, radius);
        }
      }
      ctx.globalAlpha = 1;
    },
    action(x, y) {
      burstCloud(cloud, x, y);
    },
    form(index) {
      setCloudForm(cloud, index);
    },
    physics(value) {
      cloud.physics = { ...value };
    },
    reset,
  };
}

function mirrorPoint(t: number): [number, number] {
  const angle = t * 0.015;
  const radius = 0.19 + Math.sin(angle * 4) * 0.12;
  return [0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius];
}

export function mirrorToy(ctx: CanvasRenderingContext2D): Toy {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 1000;
  const ink = paper.getContext("2d")!;
  let width = 1,
    height = 1,
    lastX = 0.5,
    lastY = 0.5,
    wasHeld = false,
    demo = true;
  const stroke = (x: number, y: number, px: number, py: number, sectors: number) => {
    ink.lineWidth = 2.8;
    for (let i = 0; i < sectors; i++)
      for (const flip of [-1, 1]) {
        ink.save();
        ink.translate(500, 500);
        ink.rotate((i / sectors) * Math.PI * 2);
        ink.scale(1, flip);
        ink.beginPath();
        ink.moveTo((px - 0.5) * 1000, (py - 0.5) * 1000);
        ink.lineTo((x - 0.5) * 1000, (y - 0.5) * 1000);
        ink.strokeStyle = i % 3 === 0 ? "#ffe6e8d0" : "#ff315fc0";
        ink.stroke();
        ink.restore();
      }
  };
  const reset = () => {
    ink.clearRect(0, 0, 1000, 1000);
    demo = true;
    for (let i = 1; i < 350; i++) {
      const p = mirrorPoint(i),
        prev = mirrorPoint(i - 1);
      stroke(p[0], p[1], prev[0], prev[1], 6);
    }
  };
  reset();
  return {
    resize(w, h) {
      width = w;
      height = h;
    },
    draw(_dt, x, y, parameter, _active, held) {
      const size = Math.min(width * 0.92, height * 0.86);
      const px = 0.5 + ((x - 0.5) * width) / size;
      const py = 0.5 + ((y - 0.5) * height) / size;
      if (held) {
        if (demo) {
          ink.clearRect(0, 0, 1000, 1000);
          demo = false;
        }
        if (wasHeld) stroke(px, py, lastX, lastY, 3 + Math.round(parameter * 9));
        else stroke(px, py, px + 0.001, py + 0.001, 3 + Math.round(parameter * 9));
      }
      lastX = px;
      lastY = py;
      wasHeld = held;
      ctx.drawImage(paper, (width - size) / 2, (height - size) / 2, size, size);
    },
    action() {
      ink.clearRect(0, 0, 1000, 1000);
      demo = false;
    },
    reset,
  };
}

export function breakerToy(ctx: CanvasRenderingContext2D, report: (game: GameState) => void): Toy {
  let game = newBreaker();
  let width = 1,
    height = 1;
  const notify = () => report({ ...newGame(), status: game.status, score: game.score });
  return {
    resize(w, h) {
      width = w;
      height = h;
    },
    draw(dt, x) {
      const oldScore = game.score,
        oldStatus = game.status;
      stepBreaker(game, dt, x);
      if (oldScore !== game.score || oldStatus !== game.status) notify();
      const colors = ["#ff3155", "#bc2948", "#82223d", "#f2a4b5"];
      for (let i = 0; i < game.bricks.length; i++) {
        if (!game.bricks[i]) continue;
        const r = brickRect(i);
        ctx.fillStyle = colors[Math.floor(i / 8)]!;
        ctx.fillRect(r.x * width, r.y * height, r.w * width, r.h * height);
        ctx.fillStyle = "#ffffff35";
        ctx.fillRect(r.x * width, r.y * height, r.w * width, 1);
      }
      for (let i = game.trail.length - 1; i >= 0; i--) {
        const p = game.trail[i]!;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, Math.max(1, 4 - i * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,60,100,${0.45 * (1 - i / 12)})`;
        ctx.fill();
      }
      ctx.fillStyle = "#fff1ef";
      ctx.beginPath();
      ctx.arc(game.x * width, game.y * height, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff3155";
      ctx.fillRect((game.paddle - PADDLE_HALF) * width, 0.87 * height, PADDLE_HALF * 2 * width, 6);
      ctx.fillStyle = "#ffd3de";
      ctx.fillRect((game.paddle - PADDLE_HALF) * width, 0.87 * height, PADDLE_HALF * 2 * width, 1);
    },
    action() {
      if (game.status === "running") return;
      if (game.status !== "ready") game = newBreaker();
      game.status = "running";
      notify();
    },
    reset() {
      game = newBreaker();
      notify();
    },
  };
}
