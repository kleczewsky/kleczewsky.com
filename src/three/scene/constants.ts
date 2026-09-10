/* Draw order is the whole perf strategy: the window frame draws
   first as a near opaque occluder, city next sorted near-to-far for
   early-Z, then suburbs, ground, sky last pinned to the far plane. */

/** Vertical FOV. The window frame is sized from it. */
export const FOV = 40;

/** Eye height, and the plane the glass sits on. */
export const EYE = 1.5;
export const GLASS_Z = -1.4;
export const GLASS_DIST = 3.6;

/** Where the camera comes to rest. The wordmark is placed from this. */
export const CAM_Z = 2.2;

/** Half-height of the glass plane. Independent of aspect. */
export const GLASS_HALF_H = GLASS_DIST * Math.tan(((FOV / 2) * Math.PI) / 180);

/** Ground level. The tallest towers still cross the eye line. */
export const CITY_FLOOR = -170;

/** CSS area a full-height canvas covers, and the reference the pixel
 * ratio ceiling is scaled from. */
export const RATIO_AREA = 500_000;

/** Street block size, in world units. Also the window bay module. */
export const BLOCK = 42;

export const SITES = 520;
export const MAST_LIMIT = 90;
export const ROOF_LIMIT = 150;

/** One volley: shells, sparks each, then a finale on its own with more
 * of them. FIRE_RUN is the length in seconds, which the window dim and
 * the retrigger cooldown are both timed against. */
export const SHELLS = 6;
export const SPARKS = 110;
export const HEART = 260;
export const FIRE_RUN = 10;

/** Far-field filler: past two kilometres nothing survives but the
 * outline, so these carry no windows, setbacks or shader at all. */
export const SUBURBS = 2000;

/** Overlap between stacked tiers, and into the ground. Without it the
    coplanar faces z-fight at grazing angles. */
export const OVERLAP = 2;

/** Draw order. Near opaque occluders first, sky last. */
export const ORDER = {
  /** Opaque, nearest first: this is the occluder. */
  frame: -10,
  city: 0,
  suburbs: 1,
  ground: 2,
  /** Opaque, last: depth-rejected by everything above. */
  sky: 100,
  /** Transparent, in depth order out to in. */
  stars: 1,
  blimp: 1,
  wordmark: 2,
  beacons: 3,
  glass: 4,
} as const;
