export const PARTICLE_FORMS = ["monogram", "infinity", "knot"] as const;
export const DEFAULT_PARTICLE_PHYSICS = { spring: 10, damping: 3.5 };
export type ParticlePhysics = typeof DEFAULT_PARTICLE_PHYSICS;
export const PARTICLE_PHYSICS_RANGES = {
  spring: { min: 1, max: 30, step: 1 },
  damping: { min: 0.5, max: 20, step: 0.5 },
};
export type Cloud = {
  data: Float32Array;
  targets: Float32Array;
  count: number;
  aspect: number;
  form: number;
  time: number;
  phase: number;
  rippleCooldown: number;
  physics: ParticlePhysics;
};
const STRIDE = 8;
const TAU = Math.PI * 2;
const SAMPLES = 768;
type Point = [number, number, number];

// The two outlines are the site's existing favicon mark, in its 32px viewBox.
const MARK = [
  [
    [3.9481, 6.19954],
    [8.00779, 6.19954],
    [8.00779, 14.132],
    [10.5826, 14.132],
    [16.1768, 6.19954],
    [20.8905, 6.19954],
    [14.1049, 15.8931],
    [21.1495, 25.8005],
    [16.1768, 25.8005],
    [10.5826, 17.9133],
    [8.00779, 17.9133],
    [8.00779, 25.8005],
    [3.9481, 25.8005],
  ],
  [
    [24.5403, 25.8005],
    [17.6055, 15.8931],
    [24.5403, 6.19954],
    [29.254, 6.19954],
    [22.4684, 15.8931],
    [29.513, 25.8005],
  ],
];

function outline(points: number[][]): Float32Array {
  const lengths = points.map((p, i) => {
    const next = points[(i + 1) % points.length]!;
    return Math.hypot(next[0]! - p[0]!, next[1]! - p[1]!);
  });
  const total = lengths.reduce((sum, value) => sum + value, 0);
  return curve((u) => {
    let distance = u * total;
    let edge = 0;
    while (edge < lengths.length - 1 && distance > lengths[edge]!) distance -= lengths[edge++]!;
    const a = points[edge]!,
      b = points[(edge + 1) % points.length]!;
    const t = distance / lengths[edge]!;
    return [
      (a[0]! + (b[0]! - a[0]!) * t - 16.7) * 0.093,
      (a[1]! + (b[1]! - a[1]!) * t - 16) * 0.093,
      0,
    ];
  });
}

function curve(point: (u: number) => Point): Float32Array {
  const result = new Float32Array(SAMPLES * 3);
  for (let i = 0; i < SAMPLES; i++) result.set(point(i / SAMPLES), i * 3);
  return result;
}

const PATHS = [
  MARK.map(outline),
  [
    curve((u) => {
      const t = u * TAU;
      const d = 1 + Math.sin(t) ** 2;
      return [(1.4 * Math.cos(t)) / d, (1.8 * Math.sin(t) * Math.cos(t)) / d, 0.22 * Math.sin(t)];
    }),
  ],
  [
    curve((u) => {
      const t = u * TAU;
      return [
        0.44 * (2 + Math.cos(3 * t)) * Math.cos(2 * t),
        0.44 * (2 + Math.cos(3 * t)) * Math.sin(2 * t),
        0.4 * Math.sin(3 * t),
      ];
    }),
  ],
];

export function createCloud(count: number, aspect: number, random = Math.random): Cloud {
  const data = new Float32Array(count * STRIDE);
  for (let i = 0; i < count; i++) {
    const k = i * STRIDE;
    data[k] = (random() - 0.5) * 3 * aspect;
    data[k + 1] = (random() - 0.5) * 3;
    data[k + 2] = (random() - 0.5) * 2;
    data[k + 3] = (random() - 0.5) * 0.08;
    data[k + 4] = (random() - 0.5) * 0.08;
    data[k + 5] = (random() - 0.5) * 0.04;
    data[k + 6] = random();
    data[k + 7] = random();
  }
  const cloud = {
    data,
    targets: new Float32Array(count * 3),
    count,
    aspect,
    form: 0,
    time: 0,
    phase: 0,
    rippleCooldown: 0,
    physics: { ...DEFAULT_PARTICLE_PHYSICS },
  };
  updateCloudTargets(cloud, 0, 0.42);
  return cloud;
}

export function setCloudForm(cloud: Cloud, form: number) {
  cloud.form = Math.max(0, Math.min(PARTICLE_FORMS.length - 1, Math.round(form)));
  updateCloudTargets(cloud, 0, 0.42);
}

export function updateCloudTargets(cloud: Cloud, dt: number, flow: number) {
  cloud.time += dt;
  cloud.phase = (cloud.phase + dt * (0.008 + flow * 0.023)) % 1;
  const paths = PATHS[cloud.form]!;
  const scale = Math.min(1, cloud.aspect / 1.05);
  const rotation =
    cloud.form === 0 ? Math.sin(cloud.time * 0.2) * 0.08 : Math.sin(cloud.time * 0.17) * 0.3;
  const cos = Math.cos(rotation),
    sin = Math.sin(rotation);
  for (let i = 0; i < cloud.count; i++) {
    const path = paths[paths.length > 1 && i % 4 === 0 ? 1 : 0]!;
    const u = ((cloud.data[i * STRIDE + 7]! + cloud.phase) % 1) * SAMPLES;
    const a = Math.floor(u),
      b = (a + 1) % SAMPLES,
      blend = u - a;
    const dx = path[b * 3]! - path[a * 3]!;
    const dy = path[b * 3 + 1]! - path[a * 3 + 1]!;
    const length = Math.hypot(dx, dy) || 1;
    const cross = i * 2.399963;
    const radius = (cloud.form === 0 ? 0.048 : 0.11) * (0.3 + cloud.data[i * STRIDE + 6]! * 0.7);
    const ribbon = Math.cos(cross) * radius;
    const x = path[a * 3]! + dx * blend - (dy / length) * ribbon;
    const y = path[a * 3 + 1]! + dy * blend + (dx / length) * ribbon;
    const z =
      path[a * 3 + 2]! + (path[b * 3 + 2]! - path[a * 3 + 2]!) * blend + Math.sin(cross) * radius;
    cloud.targets[i * 3] = (x * cos + z * sin) * scale;
    cloud.targets[i * 3 + 1] = y * scale;
    cloud.targets[i * 3 + 2] = (z * cos - x * sin) * scale;
  }
}

export function stepCloud(
  cloud: Cloud,
  dt: number,
  pointer: { x: number; y: number; active: boolean },
  strength: number,
) {
  cloud.rippleCooldown = Math.max(0, cloud.rippleCooldown - dt);
  const p = cloud.data;
  const tx = (pointer.x - 0.5) * 3.2 * cloud.aspect;
  const ty = (pointer.y - 0.5) * 3.2;
  const damping = Math.exp(-dt * cloud.physics.damping);
  const spring = cloud.physics.spring;
  for (let i = 0; i < cloud.count; i++) {
    const k = i * STRIDE,
      j = i * 3;
    const x = p[k]!,
      y = p[k + 1]!,
      z = p[k + 2]!;
    let ax = (cloud.targets[j]! - x) * spring;
    let ay = (cloud.targets[j + 1]! - y) * spring;
    const az = (cloud.targets[j + 2]! - z) * spring;
    if (pointer.active) {
      const dx = x - tx,
        dy = y - ty;
      const distance = Math.hypot(dx, dy) || 0.001;
      const influence = Math.exp(-(distance * distance) / 0.09);
      const force = influence * (2 + strength * 3);
      ax += (dx / distance) * force - (dy / distance) * force * 0.4;
      ay += (dy / distance) * force + (dx / distance) * force * 0.4;
    }
    p[k + 3] = (p[k + 3]! + ax * dt) * damping;
    p[k + 4] = (p[k + 4]! + ay * dt) * damping;
    p[k + 5] = (p[k + 5]! + az * dt) * damping;
    p[k] = x + p[k + 3]! * dt;
    p[k + 1] = y + p[k + 4]! * dt;
    p[k + 2] = z + p[k + 5]! * dt;
  }
}

export function burstCloud(cloud: Cloud, x: number, y: number) {
  if (cloud.rippleCooldown > 0) return;
  cloud.rippleCooldown = 0.32;
  const p = cloud.data;
  for (let i = 0; i < p.length; i += STRIDE) {
    const dx = p[i]! - (x - 0.5) * 3.2 * cloud.aspect;
    const dy = p[i + 1]! - (y - 0.5) * 3.2;
    const distance = Math.hypot(dx, dy) || 0.01;
    const impulse = 3 * Math.exp((-distance * distance) / 0.65);
    // A local impulse, capped even under repeated clicks; the form always wins.
    p[i + 3] = Math.max(-1.2, Math.min(1.2, p[i + 3]! + (dx / distance) * impulse));
    p[i + 4] = Math.max(-1.2, Math.min(1.2, p[i + 4]! + (dy / distance) * impulse));
  }
}
