type Point = [number, number, number];

/** Burst positions are composed in the view, launch points come from the city. */
export function planFireworks(
  beacons: ArrayLike<number>,
  shells: number,
  aspect: number,
  tanHalfFov: number,
  cameraZ: number,
) {
  const tips: Point[] = [];
  for (let i = 0; i < beacons.length; i += 3) {
    const z = beacons[i + 2] ?? 0;
    if (-z > 700 && -z < 2000) tips.push([beacons[i] ?? 0, beacons[i + 1] ?? 60, z]);
  }
  if (!tips.length) tips.push([0, 60, -1400]);
  const halfWidth = (z: number) => (cameraZ - z) * tanHalfFov * Math.max(aspect, 0.1);
  const nearest = (x: number) =>
    tips.reduce((best, tip) =>
      Math.abs(tip[0] / halfWidth(tip[2]) - x) < Math.abs(best[0] / halfWidth(best[2]) - x)
        ? tip
        : best,
    );
  const pairs = Math.ceil(shells / 2);
  const launches = Array.from({ length: shells }, (_, i) => {
    // Outside-in, alternating sides. Keep the center clear for the finale.
    const x = (i % 2 === 0 ? -1 : 1) * (0.68 - Math.floor(i / 2) * (0.54 / Math.max(1, pairs - 1)));
    const origin = nearest(x);
    return { origin, x: x * halfWidth(origin[2]) };
  });
  return { launches, finale: { origin: nearest(0), x: 0 } };
}
