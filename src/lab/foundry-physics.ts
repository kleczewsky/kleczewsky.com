export type Letter = {
  glyph: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  hw: number;
  hh: number;
  color: number;
};
export type Foundry = { letters: Letter[]; width: number; height: number; serial: number };
export const LETTER_LIMIT = 24;
type Point = { x: number; y: number };

export function stampLetters(world: Foundry, text: string, measure: (glyph: string) => number) {
  const glyphs = [...text.trim().toUpperCase()].filter((c) => c.trim()).slice(0, 12);
  const size = Math.min(110, world.width / 4.8);
  const widths = glyphs.map((glyph) => Math.max(size * 0.22, measure(glyph) * size));
  const total = widths.reduce((sum, width) => sum + width + 10, 0) - 10;
  let x = Math.max(30, (world.width - Math.min(total, world.width - 60)) / 2);
  let row = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const width = widths[i]!;
    if (x + width > world.width - 25) {
      x = 30;
      row++;
    }
    world.letters.push({
      glyph: glyphs[i]!,
      x: x + width / 2,
      y: 50 - row * (size + 20) - i * 6,
      vx: Math.sin(world.serial * 2.4) * 35,
      vy: 0,
      angle: Math.sin(world.serial * 1.7) * 0.14,
      spin: Math.cos(world.serial) * 0.2,
      hw: width / 2,
      hh: size / 2,
      color: world.serial++ % 4,
    });
    x += width + 10;
  }
  if (world.letters.length > LETTER_LIMIT)
    world.letters.splice(0, world.letters.length - LETTER_LIMIT);
}

function axes(body: Letter): [Point, Point] {
  const c = Math.cos(body.angle),
    s = Math.sin(body.angle);
  return [
    { x: c, y: s },
    { x: -s, y: c },
  ];
}
function corners(body: Letter): Point[] {
  const [a, b] = axes(body);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x: body.x + a.x * body.hw * x! + b.x * body.hh * y!,
    y: body.y + a.y * body.hw * x! + b.y * body.hh * y!,
  }));
}
function inverseInertia(body: Letter) {
  return 3 / (body.hw * body.hw + body.hh * body.hh);
}
function support(body: Letter, n: Point): Point {
  const points = corners(body);
  const dots = points.map((p) => p.x * n.x + p.y * n.y);
  const furthest = Math.max(...dots);
  const face = points.filter((_, i) => dots[i]! > furthest - 1.5);
  return {
    x: face.reduce((sum, p) => sum + p.x, 0) / face.length,
    y: face.reduce((sum, p) => sum + p.y, 0) / face.length,
  };
}
function collide(a: Letter, b: Letter) {
  if (Math.hypot(b.x - a.x, b.y - a.y) > Math.hypot(a.hw, a.hh) + Math.hypot(b.hw, b.hh)) return;
  const aa = axes(a),
    bb = axes(b);
  let overlap = Infinity,
    normal = { x: 0, y: 0 };
  for (const axis of [...aa, ...bb]) {
    const radius = (body: Letter, basis: [Point, Point]) =>
      body.hw * Math.abs(axis.x * basis[0].x + axis.y * basis[0].y) +
      body.hh * Math.abs(axis.x * basis[1].x + axis.y * basis[1].y);
    const distance = (b.x - a.x) * axis.x + (b.y - a.y) * axis.y;
    const depth = radius(a, aa) + radius(b, bb) - Math.abs(distance);
    if (depth <= 0) return;
    if (depth < overlap) {
      overlap = depth;
      normal = { x: axis.x * Math.sign(distance || 1), y: axis.y * Math.sign(distance || 1) };
    }
  }
  const correction = Math.max(0, overlap - 0.3) * 0.36;
  a.x -= normal.x * correction;
  a.y -= normal.y * correction;
  b.x += normal.x * correction;
  b.y += normal.y * correction;
  const pa = support(a, normal),
    pb = support(b, { x: -normal.x, y: -normal.y });
  const contact = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
  const ra = { x: contact.x - a.x, y: contact.y - a.y },
    rb = { x: contact.x - b.x, y: contact.y - b.y };
  const rv = {
    x: b.vx - b.spin * rb.y - a.vx + a.spin * ra.y,
    y: b.vy + b.spin * rb.x - a.vy - a.spin * ra.x,
  };
  const speed = rv.x * normal.x + rv.y * normal.y;
  if (speed >= 0) return;
  const crossA = ra.x * normal.y - ra.y * normal.x,
    crossB = rb.x * normal.y - rb.y * normal.x;
  const ia = inverseInertia(a),
    ib = inverseInertia(b);
  const impulse = (-speed * 1.18) / (2 + crossA * crossA * ia + crossB * crossB * ib);
  a.vx -= normal.x * impulse;
  a.vy -= normal.y * impulse;
  a.spin -= crossA * impulse * ia;
  b.vx += normal.x * impulse;
  b.vy += normal.y * impulse;
  b.spin += crossB * impulse * ib;
  const tangent = { x: -normal.y, y: normal.x };
  const friction = Math.max(
    -impulse * 0.35,
    Math.min(impulse * 0.35, -(rv.x * tangent.x + rv.y * tangent.y) / 2),
  );
  a.vx -= tangent.x * friction;
  a.vy -= tangent.y * friction;
  b.vx += tangent.x * friction;
  b.vy += tangent.y * friction;
}

function walls(body: Letter, width: number, floor: number) {
  for (const p of corners(body)) {
    let nx = 0,
      ny = 0,
      depth = 0;
    if (p.y > floor) {
      ny = -1;
      depth = p.y - floor;
    } else if (p.x < 14) {
      nx = 1;
      depth = 14 - p.x;
    } else if (p.x > width - 14) {
      nx = -1;
      depth = p.x - width + 14;
    }
    if (!depth) continue;
    body.x += nx * depth;
    body.y += ny * depth;
    const rx = p.x - body.x,
      ry = p.y - body.y;
    const speed = (body.vx - body.spin * ry) * nx + (body.vy + body.spin * rx) * ny;
    if (speed < 0) {
      const cross = rx * ny - ry * nx,
        inertia = inverseInertia(body);
      const impulse = (-speed * (speed < -70 ? 1.32 : 1)) / (1 + cross * cross * inertia);
      body.vx += nx * impulse;
      body.vy += ny * impulse;
      body.spin += cross * impulse * inertia;
      if (ny) {
        body.vx *= 0.84;
        body.spin *= 0.88;
      }
    }
  }
}

export function stepFoundry(
  world: Foundry,
  dt: number,
  gravity: number,
  grab?: { index: number; x: number; y: number },
) {
  const steps = Math.max(1, Math.ceil(dt * 120)),
    h = dt / steps;
  for (let s = 0; s < steps; s++) {
    world.letters.forEach((body, i) => {
      body.vy += gravity * h;
      if (grab?.index === i) {
        body.vx += ((grab.x - body.x) * 170 - body.vx * 20) * h;
        body.vy += ((grab.y - body.y) * 170 - body.vy * 20) * h;
        body.spin *= Math.exp(-h * 5);
      }
      body.vx = Math.max(-1800, Math.min(1800, body.vx * Math.exp(-h * 0.18)));
      body.vy = Math.max(-1800, Math.min(1800, body.vy));
      body.spin = Math.max(-12, Math.min(12, body.spin * Math.exp(-h * 0.4)));
      body.x += body.vx * h;
      body.y += body.vy * h;
      body.angle += body.spin * h;
    });
    for (let iteration = 0; iteration < 5; iteration++) {
      for (let i = 0; i < world.letters.length; i++)
        for (let j = i + 1; j < world.letters.length; j++)
          collide(world.letters[i]!, world.letters[j]!);
      for (const body of world.letters) walls(body, world.width, world.height - 55);
    }
  }
}

export function pickLetter(world: Foundry, x: number, y: number): number {
  for (let i = world.letters.length - 1; i >= 0; i--) {
    const body = world.letters[i]!,
      [a, b] = axes(body);
    const dx = x - body.x,
      dy = y - body.y;
    if (
      Math.abs(dx * a.x + dy * a.y) <= body.hw + 12 &&
      Math.abs(dx * b.x + dy * b.y) <= body.hh + 12
    )
      return i;
  }
  return -1;
}
