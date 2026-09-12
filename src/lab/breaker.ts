export const BRICK_COLUMNS = 8;
export const BRICK_ROWS = 4;
export const BALL_RADIUS = 0.012;
export const PADDLE_HALF = 0.1;
export type BreakerState = {
  status: "ready" | "running" | "miss" | "won";
  x: number;
  y: number;
  vx: number;
  vy: number;
  paddle: number;
  score: number;
  bricks: boolean[];
  trail: { x: number; y: number }[];
};

export function newBreaker(): BreakerState {
  return {
    status: "ready",
    x: 0.5,
    y: 0.83,
    vx: 0.25,
    vy: -0.53,
    paddle: 0.5,
    score: 0,
    bricks: Array(BRICK_COLUMNS * BRICK_ROWS).fill(true),
    trail: [],
  };
}

export function brickRect(index: number) {
  return {
    x: 0.07 + (index % BRICK_COLUMNS) * 0.11,
    y: 0.12 + Math.floor(index / BRICK_COLUMNS) * 0.06,
    w: 0.096,
    h: 0.039,
  };
}

export function stepBreaker(game: BreakerState, dt: number, pointerX: number) {
  game.paddle = Math.max(PADDLE_HALF + 0.02, Math.min(0.98 - PADDLE_HALF, pointerX));
  if (game.status === "ready") {
    game.x = game.paddle;
    return;
  }
  if (game.status !== "running") return;
  // Small substeps prevent the ball tunnelling through a brick on slow frames.
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  for (let i = 0; i < steps; i++) {
    const oldX = game.x;
    const oldY = game.y;
    game.x += (game.vx * dt) / steps;
    game.y += (game.vy * dt) / steps;
    if (game.x < 0.025 || game.x > 0.975) {
      game.x = Math.max(0.025, Math.min(0.975, game.x));
      game.vx *= -1;
    }
    if (game.y < 0.065) {
      game.y = 0.065;
      game.vy = Math.abs(game.vy);
    }
    if (
      game.vy > 0 &&
      oldY + BALL_RADIUS <= 0.87 &&
      game.y + BALL_RADIUS >= 0.87 &&
      Math.abs(game.x - game.paddle) <= PADDLE_HALF + BALL_RADIUS
    ) {
      const angle = ((game.x - game.paddle) / PADDLE_HALF) * 1.03;
      const speed = Math.min(0.95, 0.6 + game.score * 0.008);
      game.vx = Math.sin(angle) * speed;
      game.vy = -Math.cos(angle) * speed;
      game.y = 0.87 - BALL_RADIUS;
    }
    for (let b = 0; b < game.bricks.length; b++) {
      if (!game.bricks[b]) continue;
      const r = brickRect(b);
      if (
        game.x + BALL_RADIUS < r.x ||
        game.x - BALL_RADIUS > r.x + r.w ||
        game.y + BALL_RADIUS < r.y ||
        game.y - BALL_RADIUS > r.y + r.h
      )
        continue;
      game.bricks[b] = false;
      game.score++;
      if (oldX + BALL_RADIUS <= r.x || oldX - BALL_RADIUS >= r.x + r.w) game.vx *= -1;
      else game.vy *= -1;
      break;
    }
    if (game.score === game.bricks.length) {
      game.status = "won";
      break;
    }
    if (game.y > 1.02) {
      game.status = "miss";
      break;
    }
  }
  game.trail.unshift({ x: game.x, y: game.y });
  if (game.trail.length > 12) game.trail.pop();
}
