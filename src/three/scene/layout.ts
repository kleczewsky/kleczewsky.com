import { useMemo } from "react";
import * as THREE from "three";
import { BLOCK, CAM_Z, CITY_FLOOR, EYE, MAST_LIMIT, OVERLAP, ROOF_LIMIT } from "./constants";
import { makeRandom, smoothstep } from "./math";
import type { Tokens } from "./tokens";
import type { Mark } from "./Wordmark";

/** Downtown: clustered cores rather than an even scatter; each site
 * stacks one to three boxes of decreasing footprint. */
export function useCityLayout(sites: number, mark: Mark | null) {
  return useMemo(() => {
    const rnd = makeRandom(20260908);

    const cores = [
      { x: -160, z: -520, pull: 0.8 },
      { x: 260, z: -760, pull: 0.74 },
      { x: -60, z: -1180, pull: 0.6 },
      { x: 620, z: -1500, pull: 0.5 },
      { x: -640, z: -1320, pull: 0.55 },
    ];

    // Sorted near-to-far before upload: instanced draws go in buffer
    // order and never sort themselves, so this is what lets early-Z
    // throw away the back of downtown.
    const pieces: { m: THREE.Matrix4; seed: number; d: number }[] = [];
    const roofs: THREE.Matrix4[] = [];
    const mastSites: { m: THREE.Matrix4; tip: [number, number, number]; phase: number }[] = [];
    const m = new THREE.Matrix4();
    const occupied = new Set<string>();

    for (let i = 0; i < sites; i++) {
      const t = rnd();
      // Nothing nearer than 260. Closer than that a single tower fills
      // the window, the canyons close up, and there is no skyline left
      // to look at, which is the whole subject of the frame.
      let z = -260 - Math.pow(t, 1.6) * 1900;
      const spread = 210 + -z * 0.6;
      let x = (rnd() - 0.5) * spread * 2;

      const core = cores[Math.floor(rnd() * cores.length)];
      if (core && rnd() < 0.7) {
        const g = Math.pow(rnd(), 1.6);
        x += (core.x - x) * core.pull * (1 - g * 0.55);
        z += (core.z - z) * core.pull * 0.5 * (1 - g * 0.55);
      }

      // Snap to the street grid so buildings line the canyons the
      // ground shader draws. Blocks sitting across a road is the detail
      // that quietly ruins it.
      x = Math.floor(x / BLOCK) * BLOCK + BLOCK * 0.5;
      z = Math.floor(z / BLOCK) * BLOCK + BLOCK * 0.5;
      const lot = `${x}:${z}`;
      if (occupied.has(lot)) continue;
      occupied.add(lot);
      const firstPiece = pieces.length;
      const firstRoof = roofs.length;
      const firstMast = mastSites.length;

      let near = 0;
      for (const c of cores) {
        const d = Math.hypot(c.x - x, (c.z - z) * 0.7);
        near = Math.max(near, 1 - Math.min(1, d / 620));
      }

      const total = 16 + Math.pow(rnd(), 2.0) * (34 + near * near * 210);
      const seed = rnd() * 100;
      const depth = -z;

      // Mix straight office slabs with stepped towers, keeping the same
      // height distribution and skyline composition.
      const slab = seed % 1 < 0.32;
      const tiers = total > 120 ? 3 : total > 60 ? 2 : 1;
      let w = 10 + rnd() * 17;
      let d = 10 + rnd() * 17;
      let base = CITY_FLOOR;
      let left = total;

      for (let s = 0; s < tiers; s++) {
        const share = s === tiers - 1 ? left : left * (0.4 + rnd() * 0.25);
        const visibleHeight = slab ? total : share;
        const h = visibleHeight + OVERLAP;
        m.makeScale(w, h, d);
        m.setPosition(x, base + visibleHeight - h / 2, z);
        if (!slab || s === 0) pieces.push({ m: m.clone(), seed, d: depth });

        base += share;
        left -= share;
        w *= 0.66 + rnd() * 0.14;
        d *= 0.66 + rnd() * 0.14;
      }

      // Antennas are separate unlit metal, never window-bearing floors.
      let antennaHeight = 0;
      if (total > 165 && rnd() < 0.45) {
        antennaHeight = 8 + rnd() * 12;
      }

      if (-z < 900 && roofs.length < ROOF_LIMIT && rnd() < 0.75) {
        const boxes = 1 + Math.floor(rnd() * 2);
        for (let b = 0; b < boxes && roofs.length < ROOF_LIMIT; b++) {
          const bw = Math.max(1.5, w * (0.2 + rnd() * 0.3));
          const bd = Math.max(1.5, d * (0.2 + rnd() * 0.3));
          const bh = 1.5 + rnd() * 4;
          m.makeScale(bw, bh + OVERLAP, bd);
          m.setPosition(
            x + (rnd() - 0.5) * w * 0.5,
            base + bh - (bh + OVERLAP) / 2,
            z + (rnd() - 0.5) * d * 0.5,
          );
          roofs.push(m.clone());
        }
      }

      if (total > 100) {
        const mh = Math.max(antennaHeight, 6 + rnd() * 8);
        const h = mh + OVERLAP;
        m.makeScale(0.85, h, 0.85);
        m.setPosition(x, base + mh - h / 2, z);
        mastSites.push({ m: m.clone(), tip: [x, base + mh, z], phase: rnd() });
      }

      // Keep real depth occlusion, but reserve the upper 88% of the ink.
      // Project the limit back to each lot, so a near tower cannot cut
      // farther into the letters than a distant one. A few thin antennas
      // can cross higher without hiding the letter shapes.
      if (mark && z > mark.position[2]) {
        const distance = CAM_Z - z;
        const markDistance = CAM_Z - mark.position[2];
        const halfWord = (mark.inkWidth * 0.5 * distance) / markDistance;
        if (Math.abs(x) - 16 < halfWord) {
          const limit =
            EYE + ((mark.inkBottom + mark.inkHeight * 0.12 - EYE) * (distance - 16)) / markDistance;
          let top = base;
          for (let n = firstRoof; n < roofs.length; n++) {
            const matrix = roofs[n]!;
            top = Math.max(top, matrix.elements[13]! + matrix.elements[5]! * 0.5);
          }
          const scale = Math.min(1, (limit - CITY_FLOOR) / (top - CITY_FLOOR));
          const shorten = (matrix: THREE.Matrix4) => {
            matrix.elements[5]! *= scale;
            matrix.elements[13] = CITY_FLOOR + (matrix.elements[13]! - CITY_FLOOR) * scale;
          };
          for (let n = firstPiece; n < pieces.length; n++) shorten(pieces[n]!.m);
          for (let n = firstRoof; n < roofs.length; n++) shorten(roofs[n]!);
          for (let n = firstMast; n < mastSites.length; n++) {
            const mast = mastSites[n]!;
            shorten(mast.m);
            const foot = mast.m.elements[13]! - mast.m.elements[5]! * 0.5;
            const accent = mast.phase > 0.72;
            const antennaLimit =
              limit + (mark.inkHeight * (accent ? 0.42 : 0.08) * distance) / markDistance;
            const desired = mast.m.elements[5]! * (accent ? 2.2 : 1);
            const height = Math.max(0.1, Math.min(desired, antennaLimit - foot));
            mast.m.elements[5] = height;
            mast.m.elements[13] = foot + height * 0.5;
            mast.tip[1] = foot + height;
          }
        }
      }
    }

    pieces.sort((a, b) => a.d - b.d);

    // Tallest first, then capped. Taken in generation order the limit
    // went to the 100-unit filler, which left every beacon buried in
    // the middle of the skyline behind the towers in front of it.
    mastSites.sort((a, b) => b.tip[1] - a.tip[1]);
    mastSites.length = Math.min(mastSites.length, MAST_LIMIT);

    return {
      matrices: pieces.map((p) => p.m),
      seeds: new Float32Array(pieces.map((p) => p.seed)),
      masts: mastSites.map((s) => s.m),
      roofs,
      beacons: new Float32Array(mastSites.flatMap((s) => s.tip)),
      phases: new Float32Array(mastSites.map((s) => s.phase)),
    };
  }, [sites, mark]);
}

export type Layout = ReturnType<typeof useCityLayout>;

/** One flat buffer per attribute: the suburb belt is static, so it
 * uploads once and never comes back to the CPU. */
export type Lots = {
  count: number;
  matrices: Float32Array;
  colors: Float32Array;
};

/** Suburbs: wide, low, uniform, no clustering. */
export function useSuburbs(count: number, tokens: Tokens): Lots {
  return useMemo(() => {
    const rnd = makeRandom(7714);
    const module = BLOCK * 0.58;

    const base = tokens.facade.clone().multiplyScalar(0.34);
    const haze = tokens.haze.clone().multiplyScalar(0.34);

    const lots: {
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      c: THREE.Color;
    }[] = [];

    for (let i = 0; i < count; i++) {
      // Overlaps downtown's tail, laid out strictly behind it, the
      // belt projected into an eighteen-pixel strip.
      const z = -1150 - Math.pow(rnd(), 0.6) * 3350;
      // Wider than the frustum opens, so the belt fills the corners
      // instead of tapering to a wedge and giving the trick away.
      const spread = 1900 + -z * 1.8;
      const x = (rnd() - 0.5) * spread * 2;

      const centre = rnd() < 0.07;
      const h = centre ? 24 + rnd() * 32 : 5 + Math.pow(rnd(), 1.7) * 15;
      const w = centre ? 14 + rnd() * 16 : 17 + rnd() * 31;
      const d = centre ? 14 + rnd() * 16 : 13 + rnd() * 23;

      const gx = Math.round(x / module) * module + (rnd() - 0.5) * 6;
      const gz = Math.round(z / module) * module + (rnd() - 0.5) * 6;

      const seed = rnd();
      const c = base.clone().multiplyScalar(0.7 + 0.6 * seed);
      c.lerp(haze, smoothstep(2600, 4800, -gz));

      lots.push({ x: gx, y: CITY_FLOOR + h - (h + OVERLAP) / 2, z: gz, w, h: h + OVERLAP, d, c });
    }

    // Near to far, for the same early-Z reason downtown is sorted.
    lots.sort((a, b) => b.z - a.z);

    const matrices = new Float32Array(lots.length * 16);
    const colors = new Float32Array(lots.length * 3);
    const m = new THREE.Matrix4();

    lots.forEach((lot, i) => {
      m.makeScale(lot.w, lot.h, lot.d);
      m.setPosition(lot.x, lot.y, lot.z);
      m.toArray(matrices, i * 16);
      colors[i * 3] = lot.c.r;
      colors[i * 3 + 1] = lot.c.g;
      colors[i * 3 + 2] = lot.c.b;
    });

    return { count: lots.length, matrices, colors };
  }, [count, tokens]);
}
