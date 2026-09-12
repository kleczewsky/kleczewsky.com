import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier } from "../../lib/tier";
import { useDebug } from "../knobs";
import { CAM_Z, FOV, FIRE_RUN, HEART, ORDER, RATIO_AREA, SHELLS, SPARKS } from "./constants";
import { planFireworks } from "./firework-layout";
import { makeRandom, smoothstep } from "./math";
import type { Layout } from "./layout";
import type { Tokens } from "./tokens";

/** The lamp tokens sit near white at their own lightness, and a near
 * white base cannot read as coloured once the gain multiplies it: every
 * channel clips together. Same hue, dropped to where it is chromatic. */
function shellTint(c: THREE.Color, l: number) {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, THREE.SRGBColorSpace);
  return new THREE.Color().setHSL(hsl.h, 1, l, THREE.SRGBColorSpace);
}

/** The usual parametric heart, x over 16 and y over 13 to 17, so both
 * come back inside a unit or so. y sits low on its own range; the shift
 * is what centres the shape on the burst point. */
function heart(t: number): [number, number] {
  const x = (16 * Math.pow(Math.sin(t), 3)) / 17;
  const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
  return [x, y + 0.117];
}

/** Shells climb from a mast, then burst on a drag-and-sag model. All
 * of it is struck from uTime in the vertex shader, so a volley is one
 * draw call and no per-frame work on the CPU. */
function useShells(layout: Layout, aspect: number) {
  return useMemo(() => {
    const rnd = makeRandom(20260910);
    const n = SHELLS * SPARKS + HEART;
    const origin = new Float32Array(n * 3);
    const apex = new Float32Array(n * 3);
    const dir = new Float32Array(n * 3);
    const shell = new Float32Array(n);
    const seed = new Float32Array(n);

    const plan = planFireworks(
      layout.beacons,
      SHELLS,
      aspect,
      Math.tan((FOV * Math.PI) / 360),
      CAM_Z,
    );

    for (let s = 0; s < SHELLS; s++) {
      const launch = plan.launches[s]!;
      const tip = launch.origin;
      // Apex as a share of the depth, not an absolute height: one climb
      // reads as a third of the frame near and a sliver far.
      const top = -tip[2] * (0.13 + rnd() * 0.06);

      for (let i = 0; i < SPARKS; i++) {
        const k = s * SPARKS + i;
        origin[k * 3] = tip[0];
        origin[k * 3 + 1] = tip[1] - 18;
        origin[k * 3 + 2] = tip[2];
        apex[k * 3] = launch.x;
        apex[k * 3 + 1] = top;
        apex[k * 3 + 2] = tip[2];

        const u = rnd() * 2 - 1;
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(Math.max(0, 1 - u * u)) * (0.5 + rnd() * 0.5);
        dir[k * 3] = Math.cos(a) * r;
        dir[k * 3 + 1] = u * (0.5 + rnd() * 0.5);
        dir[k * 3 + 2] = Math.sin(a) * r;

        shell[k] = s;
        seed[k] = rnd();
      }
    }

    // A real mast launches the finale, but its apex is on the view axis.
    const mid = plan.finale.origin;

    // Clear sky in this frame is a band from just over the wordmark to
    // just under the blinds. The apex is a share of the depth so it
    // lands mid-band whatever mast it went up from, and the spread is
    // scaled by the same depth so the shape is the same size on screen.
    const top = -mid[2] * 0.155;
    const reach = -mid[2] / 1400;

    for (let i = 0; i < HEART; i++) {
      const k = SHELLS * SPARKS + i;
      origin[k * 3] = mid[0];
      origin[k * 3 + 1] = mid[1] - 18;
      origin[k * 3 + 2] = mid[2];
      apex[k * 3] = plan.finale.x;
      apex[k * 3 + 1] = top;
      apex[k * 3 + 2] = mid[2];

      // Most of them on the outline: a shell is a shell, and a filled
      // blob loses the shape the moment it starts to spread.
      const [hx, hy] = heart((i / HEART) * Math.PI * 2);
      const on = (0.84 + rnd() * 0.16) * reach;
      dir[k * 3] = hx * on;
      dir[k * 3 + 1] = hy * on;
      dir[k * 3 + 2] = (rnd() - 0.5) * 0.12 * reach;

      shell[k] = SHELLS;
      seed[k] = rnd();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(origin, 3));
    g.setAttribute("aApex", new THREE.BufferAttribute(apex, 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    g.setAttribute("aShell", new THREE.BufferAttribute(shell, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [layout, aspect]);
}

const FIRE_VERT = /* glsl */ `
  attribute vec3 aApex;
  attribute vec3 aDir;
  attribute float aShell;
  attribute float aSeed;
  varying float vOn;
  varying vec3 vTint;
  uniform float uTime;
  uniform float uStart;
  uniform float uBurst;
  uniform float uScale;
  uniform float uDpr;
  uniform float uFinale;
  uniform vec3 uTints[5];

  void main() {
    // The finale waits for the rest to clear, opens wider, burns
    // longer and barely sags, so the shape stays legible.
    float fin = step(uFinale - 0.5, aShell);
    float age = uTime - uStart - aShell * 0.45 - fin * 1.3;
    float rise = 1.3 + fract(aSeed * 7.13) * 0.4 + fin * 0.25;
    float burn = 2.6 + fin * 1.2;

    // A tenth of the sparks fly the shell up as its trail; the
    // rest sit at the launch point until it opens.
    float trail = step(fract(aSeed * 11.0), 0.09);
    float lag = trail * fract(aSeed * 23.0) * 0.25;
    float k = clamp(age / rise - lag, 0.0, 1.0);
    vec3 climb = mix(position, aApex, k * (2.0 - k));

    float b = clamp(age - rise, 0.0, burn + 0.5);
    vec3 spread = aDir * uBurst * (1.0 + fin * 0.45) * (1.0 - exp(-b * 1.8)) / 1.8;
    spread.y -= 11.0 * b * b * (1.0 - fin * 0.72);

    float open = step(rise, age);
    vec3 world = mix(climb, aApex + spread, open);

    float on = mix(trail * (1.0 - lag * 3.0), smoothstep(burn, burn * 0.25, b), open);
    vOn = step(0.0, age) * on * (0.55 + 0.45 * sin(uTime * 26.0 + aSeed * 120.0));

    vTint = mix(uTints[int(mod(aShell, 5.0))], uTints[0], fin);

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_PointSize = clamp(uScale * (1.0 + fin * 0.35) / max(1.0, -mv.z), 1.6, 9.0) * uDpr;
    gl_Position = projectionMatrix * mv;
  }
`;

const FIRE_FRAG = /* glsl */ `
  varying float vOn;
  varying vec3 vTint;
  uniform float uGlow;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    if (r > 0.5) discard;
    float core = smoothstep(0.5, 0.0, r);

    // Nothing tone maps, so anything over one clips, and a disc
    // that is hot all the way across clips in every channel and
    // comes out white. Only the last eighth of the radius is
    // allowed over: the rest stays chromatic and takes the gain
    // past the 0.76 bloom threshold in its own hue.
    float white = pow(core, 8.0);
    vec3 col = mix(vTint, vec3(1.0), white * 0.85);

    // A wide skirt under the head, so a spark carries its own
    // halo at every tier rather than relying on the composer.
    float body = pow(core, 3.0) + core * 0.3;
    gl_FragColor = vec4(col * uGlow, body * vOn);
  }
`;

export function Fireworks({
  tokens,
  layout,
  tier,
  volley,
}: {
  tokens: Tokens;
  layout: Layout;
  tier: Tier;
  volley: RefObject<number>;
}) {
  const size = useThree((s) => s.size);
  const geo = useShells(layout, size.width / Math.max(1, size.height));
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = useDebug();
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => () => geo.dispose(), [geo]);

  const pixels = size.width * size.height * dpr * dpr;
  const glowScale = smoothstep(RATIO_AREA * 0.8, RATIO_AREA * 2.4, pixels);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStart: { value: -1e4 },
      uBurst: { value: d.fireBurst },
      // Only tier a has the composer and its half-float target. Below
      // that the gain has nowhere to go but clip, taking the colour.
      uGlow: {
        value: d.fireGlow * (tier === "a" ? 0.2 + 0.8 * glowScale : 0.4),
      },
      uScale: { value: 5200 },
      uDpr: { value: dpr },
      uFinale: { value: SHELLS },
      // Red, gold and ice come off the site's own tokens; green and
      // violet have no token to come from and are set by hue.
      uTints: {
        value: [
          tokens.primary.clone(),
          shellTint(tokens.warm, 0.52),
          shellTint(tokens.cool, 0.56),
          new THREE.Color().setHSL(0.35, 1, 0.46, THREE.SRGBColorSpace),
          new THREE.Color().setHSL(0.78, 1, 0.62, THREE.SRGBColorSpace),
        ],
      },
    }),
    [tokens, dpr, tier, d.fireBurst, d.fireGlow, glowScale],
  );

  useFrame((state) => {
    const p = points.current;
    const u = mat.current?.uniforms;
    if (!p || !u) return;
    const t = state.clock.elapsedTime;
    const since = t - volley.current;
    // Between volleys there is nothing to draw, and the vertex shader
    // is the whole cost of this.
    p.visible = since >= 0 && since < FIRE_RUN;
    if (!p.visible) return;
    if (u.uTime) u.uTime.value = t;
    if (u.uStart) u.uStart.value = volley.current;
  });

  return (
    <points ref={points} geometry={geo} renderOrder={ORDER.beacons} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        vertexShader={FIRE_VERT}
        fragmentShader={FIRE_FRAG}
      />
    </points>
  );
}
