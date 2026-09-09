import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, advance, useFrame, useThree } from "@react-three/fiber";
import {
  FlyControls,
  Instance,
  Instances,
  PerformanceMonitor,
  Sky,
  Stars,
  Stats,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { DEBUG, useDebug, type DebugState } from "./knobs";
import * as THREE from "three";
import type { Tier } from "../lib/tier";
import "./StageCanvas.css";

/* Draw order is the whole perf strategy: the window frame draws
   first as a near opaque occluder, city next sorted near-to-far for
   early-Z, then suburbs, ground, sky last pinned to the far plane. */

/** Vertical FOV. The window frame is sized from it. */
const FOV = 40;

/** Eye height, and the plane the glass sits on. */
const EYE = 1.5;
const GLASS_Z = -1.4;
const GLASS_DIST = 3.6;

/** Where the camera comes to rest. The wordmark is placed from this. */
const CAM_Z = 2.2;

/** Half-height of the glass plane. Independent of aspect. */
const GLASS_HALF_H = GLASS_DIST * Math.tan(((FOV / 2) * Math.PI) / 180);

/** Ground level. The tallest towers still cross the eye line. */
const CITY_FLOOR = -230;

/** Street block size, in world units. Also the window bay module. */
const BLOCK = 42;

const SITES = 520;
const MAST_LIMIT = 90;
const ROOF_LIMIT = 150;

/** Far-field filler: past two kilometres nothing survives but the
 * outline, so these carry no windows, setbacks or shader at all. */
const SUBURBS = 2400;

/** Overlap between stacked tiers, and into the ground. Without it the
    coplanar faces z-fight at grazing angles. */
const OVERLAP = 2;

/** Draw order. Near opaque occluders first, sky last. */
const ORDER = {
  /** Opaque, nearest first — this is the occluder. */
  frame: -10,
  city: 0,
  suburbs: 1,
  ground: 2,
  /** Opaque, last: depth-rejected by everything above. */
  sky: 100,
  /** Transparent, in depth order out to in. */
  stars: 1,
  wordmark: 2,
  beacons: 3,
  glass: 4,
} as const;

function sunVector(elevation: number, azimuth: number) {
  const el = (elevation * Math.PI) / 180;
  const az = (azimuth * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/* Preetham has no exposure of its own, and the renderer's tone
   mapping exposure is a dead end on tier A: the postprocessing
   composer takes tone mapping over. Hence dimSky(). */

/* three-stdlib's Sky shares ONE material across every instance, so
   this patches the class. Must run before the first compile; the
   guard is for StrictMode and hot reload. */
function dimSky(mat: THREE.ShaderMaterial) {
  if (mat.userData.dimmed) return;

  const marker = "vec4( retColor, 1.0 )";
  if (!mat.fragmentShader.includes(marker)) {
    // three-stdlib changed the shader out from under us. Better a dawn
    // sky and a warning than a silently black one.
    if (import.meta.env.DEV) console.warn("Sky: dim hook not found; shader changed upstream");
    return;
  }

  mat.userData.dimmed = true;
  mat.uniforms.uDim = { value: DEBUG.skyDim };
  mat.fragmentShader = `uniform float uDim;
${mat.fragmentShader.replace(marker, "vec4( retColor * uDim, 1.0 )")}`;
  mat.needsUpdate = true;
}

function tokenColor(style: CSSStyleDeclaration, name: string, fallback: string) {
  return new THREE.Color(style.getPropertyValue(name).trim() || fallback);
}

function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      ground: tokenColor(s, "--ground", "#010401"),
      skyHorizon: tokenColor(s, "--sky-horizon", "#22304e"),
      haze: tokenColor(s, "--sky-haze", "#35486e"),
      facade: tokenColor(s, "--facade", "#2b3346"),
      warm: tokenColor(s, "--lamp-warm", "#ffb257"),
      cool: tokenColor(s, "--lamp-cool", "#cfe0ff"),
      street: tokenColor(s, "--street", "#ff9036"),
      hull: tokenColor(s, "--hull", "#070a0f"),
      hullEdge: tokenColor(s, "--hull-edge", "#dbe6ff"),
      ink: tokenColor(s, "--ink", "#e6ebe6"),
      primary: tokenColor(s, "--primary", "#ff0027"),
    };
  }, []);
}

type Tokens = ReturnType<typeof useTokens>;

/** Deterministic PRNG. The composition must be identical on every load. */
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** The GLSL smoothstep, on the CPU. Used to bake distance haze into
    the suburb colours, so the shader never has to compute it. */
function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const NIGHT_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vDir;
  uniform vec3 uGlow;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -1.0, 1.0);

    // Sky glow from the city below. Pale and cold, NOT red: this is the
    // sky scattering streetlight, and from up here that reads as a lift
    // in the blue rather than as a colour of its own.
    float glow = exp(-max(h, 0.0) * 13.0) * step(-0.03, h);
    float ahead = smoothstep(-0.5, 1.0, -d.z);
    vec3 col = uGlow * glow * mix(0.06, 0.34, ahead);

    // The stars are drei's now, as a real point cloud. What is left
    // here is the horizon lift and the dither, which is all a
    // full-screen shader should ever have been doing.
    col += hash(gl_FragCoord.xy + uTime) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function NightSky({ tokens }: { tokens: Tokens }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uGlow: { value: tokens.skyHorizon.clone() },
      uTime: { value: 0 },
    }),
    [tokens],
  );

  useFrame((state) => {
    const u = mat.current?.uniforms.uTime;
    if (u) u.value = state.clock.elapsedTime;
  });

  // BackSide alone turns the sphere inside out. Do not also flip the
  // scale — the two cancel out and the sky disappears entirely.
  return (
    <mesh renderOrder={ORDER.stars} frustumCulled={false}>
      <sphereGeometry args={[3800, 32, 16]} />
      <shaderMaterial
        ref={mat}
        vertexShader={
          /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `
        }
        fragmentShader={NIGHT_FRAG}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/* drei's vertex shader transforms points with w = 0.5, doubling the
   effective radius — the shell has to be placed short of where you
   want it or the field lands past the far plane. */
const STAR_RADIUS = 2400;
const STAR_DEPTH = 300;

function Starfield({ tier, brightness }: { tier: Tier; brightness: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = tier === "a" ? 1500 : 550;

  // drei colours stars on a hue ramp at fixed lightness. Rewrite the
  // attribute once for one cool white and a horizon fade.
  useEffect(() => {
    const points = ref.current;
    if (!points) return;
    points.renderOrder = ORDER.stars;

    const pos = points.geometry.getAttribute("position");
    const col = points.geometry.getAttribute("color");
    if (!pos || !col) return;

    for (let i = 0; i < col.count; i++) {
      const y = pos.getY(i);
      const r = Math.hypot(pos.getX(i), y, pos.getZ(i)) || 1;
      const v = smoothstep(0.08, 0.6, Math.max(0, y / r)) * brightness;
      col.setXYZ(i, v * 0.84, v * 0.89, v);
    }
    col.needsUpdate = true;
  }, [brightness, count]);

  if (brightness <= 0) return null;

  return (
    <Stars
      ref={ref}
      radius={STAR_RADIUS}
      depth={STAR_DEPTH}
      count={count}
      factor={150}
      saturation={0}
      speed={0}
      fade
    />
  );
}

const GROUND_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vW;
  varying float vD;
  uniform vec3 uDark;
  uniform vec3 uStreet;
  uniform vec3 uHaze;
  uniform float uBlock;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // fwidth AA so a sub-pixel street dims instead of flickering, and
  // per-block brightness so runs aren't unbroken to the vanishing point.
  float streets(vec2 p, float period, float hw, float salt) {
    vec2 q = p / period;
    vec2 g = fwidth(q) * 0.8 + 1e-4;
    vec2 d = abs(fract(q + 0.5) - 0.5);
    vec2 m = (1.0 - smoothstep(vec2(0.0), g + hw, d)) * clamp(hw / g, 0.06, 1.0);

    vec2 id = floor(q + 0.5);
    vec2 run = floor(q);
    float lit = 0.2 + 0.8 * hash(vec2(id.x, run.y) + salt);
    float across = 0.2 + 0.8 * hash(vec2(run.x, id.y) + salt + 11.7);
    return max(m.x * lit, m.y * across);
  }

  void main() {
    vec3 col = uDark;

    // Skips the street evaluation, the expensive half of this shader,
    // wherever the lamps are out of frame or gone to haze.
    float vis = smoothstep(260.0, 760.0, vD) * (1.0 - smoothstep(2900.0, 4400.0, vD));

    if (vis > 0.002) {
      float ave = streets(vW.xz, uBlock, 0.02, 0.0);
      float side = streets(vW.xz + uBlock * 0.5, uBlock * 0.5, 0.012, 4.3) * 0.34;

      // Downtown is brighter than the outskirts — but the outskirts are
      // never dark. A suburb at night is a carpet of sodium, and that
      // carpet is what the low blocks out there are seen against.
      float core = 1.0 - smoothstep(
        240.0, 2400.0, length((vW.xz - vec2(0.0, -900.0)) * vec2(0.6, 1.0))
      );

      float lamp = max(ave, side) * mix(0.34, 1.0, core);

      // Traffic: a slow travelling brightness per block run. It and
      // the windows are the only motion in the frame.
      float flow = 0.72 + 0.28 * sin(
        vW.x * 0.06 + vW.z * 0.04 + uTime * 0.5 + hash(floor(vW.xz / uBlock)) * 20.0
      );

      col += uStreet * lamp * flow * vis * 0.34;
    }

    // Complete before the far plane, so the last visible row of ground
    // is already pure haze and reads as sky.
    col = mix(col, uHaze * 0.5, smoothstep(2800.0, 4600.0, vD));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Ground({ tokens }: { tokens: Tokens }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uDark: { value: tokens.ground.clone().lerp(tokens.facade, 0.14) },
      uStreet: { value: tokens.street.clone() },
      uHaze: { value: tokens.haze.clone() },
      uBlock: { value: BLOCK },
      uTime: { value: 0 },
    }),
    [tokens],
  );

  useFrame((state) => {
    const u = mat.current?.uniforms.uTime;
    if (u) u.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      position={[0, CITY_FLOOR, -1000]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={ORDER.ground}
      frustumCulled={false}
    >
      {/* Big enough that its far edge is past the camera's far plane:
          sized to the visible ground, its edge sat a step darker than
          the sky and drew a hard line at the horizon. */}
      <planeGeometry args={[30000, 20000]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        fog={false}
        vertexShader={
          /* glsl */ `
          varying vec3 vW;
          varying float vD;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vW = world.xyz;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vD = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `
        }
        fragmentShader={GROUND_FRAG}
      />
    </mesh>
  );
}

const CITY_VERT = /* glsl */ `
  attribute float seed;
  varying vec3 vLocal;
  varying vec3 vNrm;
  varying float vSeed;
  varying float vDepth;
  varying float vTop;

  void main() {
    vSeed = seed;
    vNrm = normalize(mat3(instanceMatrix) * normal);

    vec4 local = instanceMatrix * vec4(position, 1.0);
    vLocal = local.xyz;
    vTop = local.y;

    vec4 mv = modelViewMatrix * local;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const CITY_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vLocal;
  varying vec3 vNrm;
  varying float vSeed;
  varying float vDepth;
  varying float vTop;

  uniform vec3 uFacade;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform vec3 uHaze;
  uniform float uTime;
  uniform float uFloor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float toward = 0.5 + 0.5 * smoothstep(-1.0, 1.0, -vNrm.z);
    float isRoof = step(0.5, abs(vNrm.y));
    float roof = mix(1.0, 1.45, isRoof);

    // Street light falls off going up, so the bottom of a tower is
    // brighter than its top. Subtle, and it is most of what makes
    // these read as buildings rather than as prisms.
    float above = (vTop - uFloor) * 0.006;
    float fromBelow = mix(1.25, 0.42, clamp(above, 0.0, 1.0));

    // 0.55: a night facade is a dark surface catching a little light,
    // not a lit one. Without it there is no black left in the city.
    vec3 col = uFacade * toward * roof * fromBelow * 0.55;

    // Distant blocks fall to silhouette against a brighter sky, which
    // gives the wordmark a ridge to stand on.
    float far = smoothstep(500.0, 2100.0, vDepth);

    // Windows cost eight sin()-based hashes and are invisible once
    // depth has crushed them; gating both is the cheapest win here.
    if (isRoof < 0.5 && far < 0.9) {
      float across = abs(vNrm.x) > 0.5 ? vLocal.z : vLocal.x;
      vec2 cell = vec2(across / 2.5, vLocal.y / 2.8);
      vec2 id = floor(cell);
      vec2 f = fract(cell);

      float win =
        step(0.18, f.x) * step(f.x, 0.8) *
        step(0.22, f.y) * step(f.y, 0.82);

      float k = hash(id + vSeed * 37.0);
      float self = hash(id + vSeed);
      // Roughly a third of the windows. Real towers at night are
      // mostly dark, and the ones that are not are what you look at.
      float lit = step(0.68, k);

      float floorRun = step(0.84, hash(vec2(id.y, vSeed * 9.0)));
      lit = max(lit, floorRun * step(0.35, self));

      // NB: active, filter, input, output and sample are reserved
      // words in GLSL ES and will not compile.
      float swaps = step(0.92, hash(id.yx + vSeed * 3.0));
      float slot = floor(uTime * 0.12 + self * 40.0);
      lit = mix(lit, step(0.45, hash(id + slot * 1.7)), swaps);

      // Amber, with a minority of cool-white offices. NEVER red — red
      // windows read as alarm, and red here belongs to the obstruction
      // lights, the ceiling strip and the wordmark alone.
      vec3 lamp = mix(uWarm, uCool, step(0.84, hash(id.yx + vSeed * 11.0)));
      float bright = 0.42 + 0.58 * fract(k * 7.31 + self);

      col += lamp * win * lit * bright * 1.05;
    }

    col *= mix(1.0, 0.07, far);
    col = mix(col, uHaze * 0.3, far * far * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Downtown: clustered cores rather than an even scatter; each site
 * stacks one to three boxes of decreasing footprint. */
function useCityLayout(sites: number) {
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
    const masts: THREE.Matrix4[] = [];
    const roofs: THREE.Matrix4[] = [];
    const beacons: number[] = [];
    const phases: number[] = [];
    const m = new THREE.Matrix4();

    for (let i = 0; i < sites; i++) {
      const t = rnd();
      // Nothing nearer than 260. Closer than that a single tower fills
      // the window, the canyons close up, and there is no skyline left
      // to look at — which is the whole subject of the frame.
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
      x = Math.round(x / BLOCK) * BLOCK + (rnd() - 0.5) * 8;
      z = Math.round(z / BLOCK) * BLOCK + (rnd() - 0.5) * 8;

      let near = 0;
      for (const c of cores) {
        const d = Math.hypot(c.x - x, (c.z - z) * 0.7);
        near = Math.max(near, 1 - Math.min(1, d / 620));
      }

      const total = 16 + Math.pow(rnd(), 2.0) * (34 + near * near * 210);
      const seed = rnd() * 100;
      const depth = -z;

      const tiers = total > 120 ? 3 : total > 60 ? 2 : 1;
      let w = 10 + rnd() * 17;
      let d = 10 + rnd() * 17;
      let base = CITY_FLOOR;
      let left = total;

      for (let s = 0; s < tiers; s++) {
        const share = s === tiers - 1 ? left : left * (0.4 + rnd() * 0.25);
        const h = share + OVERLAP;
        m.makeScale(w, h, d);
        m.setPosition(x, base + share - h / 2, z);
        pieces.push({ m: m.clone(), seed: seed + s * 0.31, d: depth });

        base += share;
        left -= share;
        w *= 0.66 + rnd() * 0.14;
        d *= 0.66 + rnd() * 0.14;
      }

      // A slender spire on a few of the tallest, which is what gives a
      // skyline a landmark to be read against.
      if (total > 165 && rnd() < 0.45) {
        const sh = 20 + rnd() * 46;
        const h = sh + OVERLAP;
        m.makeScale(Math.max(1.6, w * 0.22), h, Math.max(1.6, d * 0.22));
        m.setPosition(x, base + sh - h / 2, z);
        pieces.push({ m: m.clone(), seed: seed + 5.7, d: depth });
        base += sh;
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

      if (total > 100 && masts.length < MAST_LIMIT) {
        const mh = 8 + rnd() * 26;
        const h = mh + OVERLAP;
        m.makeScale(0.85, h, 0.85);
        m.setPosition(x, base + mh - h / 2, z);
        masts.push(m.clone());
        beacons.push(x, base + mh, z);
        phases.push(rnd());
      }
    }

    pieces.sort((a, b) => a.d - b.d);

    return {
      matrices: pieces.map((p) => p.m),
      seeds: new Float32Array(pieces.map((p) => p.seed)),
      masts,
      roofs,
      beacons: new Float32Array(beacons),
      phases: new Float32Array(phases),
    };
  }, [sites]);
}

type Layout = ReturnType<typeof useCityLayout>;

function City({ tokens, layout }: { tokens: Tokens; layout: Layout }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mastMesh = useRef<THREE.InstancedMesh>(null);
  const roofMesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uFacade: { value: tokens.facade.clone() },
      uWarm: { value: tokens.warm.clone() },
      uCool: { value: tokens.cool.clone() },
      uHaze: { value: tokens.haze.clone() },
      uTime: { value: 0 },
      uFloor: { value: CITY_FLOOR },
    }),
    [tokens],
  );

  useFrame((state) => {
    const u = mat.current?.uniforms.uTime;
    if (u) u.value = state.clock.elapsedTime;
  });

  useEffect(() => {
    const inst = mesh.current;
    if (inst) {
      layout.matrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.geometry.setAttribute("seed", new THREE.InstancedBufferAttribute(layout.seeds, 1));
    }
    const masts = mastMesh.current;
    if (masts && layout.masts.length > 0) {
      layout.masts.forEach((m, i) => masts.setMatrixAt(i, m));
      masts.instanceMatrix.needsUpdate = true;
      masts.count = layout.masts.length;
    }
    const roofs = roofMesh.current;
    if (roofs && layout.roofs.length > 0) {
      layout.roofs.forEach((m, i) => roofs.setMatrixAt(i, m));
      roofs.instanceMatrix.needsUpdate = true;
      roofs.count = layout.roofs.length;
    }
  }, [layout]);

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, layout.matrices.length]}
        renderOrder={ORDER.city}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <shaderMaterial
          ref={mat}
          vertexShader={CITY_VERT}
          fragmentShader={CITY_FRAG}
          uniforms={uniforms}
          fog={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={roofMesh}
        args={[undefined, undefined, Math.max(1, layout.roofs.length)]}
        renderOrder={ORDER.city}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={tokens.facade.clone().multiplyScalar(0.5)}
          fog={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={mastMesh}
        args={[undefined, undefined, Math.max(1, layout.masts.length)]}
        renderOrder={ORDER.city}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={tokens.ground} fog={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/* drei's <Instances>: buildings never move, so frames={1} fills the
   matrix buffer once; the camera never moves either, so distance
   haze is baked into the colour on the CPU. */

type Lot = {
  position: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
};

/** Suburbs: wide, low, uniform, no clustering. */
function useSuburbs(count: number, tokens: Tokens) {
  return useMemo<Lot[]>(() => {
    const rnd = makeRandom(7714);
    const module = BLOCK * 0.58;

    const base = tokens.facade.clone().multiplyScalar(0.34);
    const haze = tokens.haze.clone().multiplyScalar(0.34);

    const lots: Lot[] = [];

    for (let i = 0; i < count; i++) {
      // Overlaps downtown's tail — laid out strictly behind it, the
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
      const color = base.clone().multiplyScalar(0.7 + 0.6 * seed);
      color.lerp(haze, smoothstep(2600, 4800, -gz));

      lots.push({
        position: [gx, CITY_FLOOR + h - (h + OVERLAP) / 2, gz],
        scale: [w, h + OVERLAP, d],
        color,
      });
    }

    // Near to far, for the same early-Z reason downtown is sorted.
    lots.sort((a, b) => b.position[2] - a.position[2]);
    return lots;
  }, [count, tokens]);
}

function Suburbs({ lots }: { lots: Lot[] }) {
  return (
    <Instances
      limit={lots.length}
      range={lots.length}
      frames={1}
      renderOrder={ORDER.suburbs}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial fog={false} toneMapped={false} />
      {lots.map((lot, i) => (
        <Instance key={i} position={lot.position} scale={lot.scale} color={lot.color} />
      ))}
    </Instances>
  );
}

/* The one red in the city. They do not blink in unison; real ones
   never do. */

function Beacons({ tokens, layout, tier }: { tokens: Tokens; layout: Layout; tier: Tier }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layout.beacons, 3));
    g.setAttribute("phase", new THREE.BufferAttribute(layout.phases, 1));
    return g;
  }, [layout]);

  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: tokens.primary.clone() },
      uTime: { value: 0 },
      uScale: { value: tier === "a" ? 320 : 230 },
    }),
    [tokens, tier],
  );

  useFrame((state) => {
    const u = mat.current?.uniforms.uTime;
    if (u) u.value = state.clock.elapsedTime;
  });

  if (layout.phases.length === 0) return null;

  return (
    <points geometry={geo} renderOrder={ORDER.beacons} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        vertexShader={
          /* glsl */ `
          attribute float phase;
          varying float vOn;
          uniform float uTime;
          uniform float uScale;
          void main() {
            float period = 1.5 + phase * 1.3;
            float cyc = fract(uTime / period + phase);
            float flash = smoothstep(0.4, 0.26, cyc) * smoothstep(0.0, 0.05, cyc);
            // A real obstruction light burns at a low steady intensity
            // between flashes; it never goes fully dark.
            vOn = max(flash, 0.3);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = clamp(uScale / max(1.0, -mv.z), 1.4, 7.0);
            gl_Position = projectionMatrix * mv;
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          precision mediump float;
          varying float vOn;
          uniform vec3 uColor;
          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float d = length(p);
            if (d > 0.5) discard;
            float core = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, core * core * vOn * 0.85);
          }
        `
        }
      />
    </points>
  );
}

/* The typeface is read off the DOM heading's computed style, so the
   wordmark in the scene and the one a no-WebGL visitor reads are the
   same. The h1 stays in the document; only its ink fades. */

type Mark = {
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  position: [number, number, number];
  /** How far the letters reach from centre, as a fraction of the half
   * width. The mullions are placed from it. */
  reach: number;
};

/** Share of the full frame width the letters take at scale 1. */
const MARK_WIDTH = 0.56;

function buildWordmark(width: number, height: number, tokens: Tokens, d: DebugState): Mark | null {
  // h1, not just the attribute: the flag this sets lives on <html>,
  // and [data-wordmark] alone matched the root element first.
  const el = document.querySelector<HTMLElement>("h1[data-wordmark]");
  if (!el || width < 2 || height < 2) return null;

  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  if (!Number.isFinite(size) || size < 4) return null;

  const text = el.textContent?.trim().toUpperCase() ?? "";
  if (!text) return null;
  // The accent is the trailing span. Read the split point off the DOM
  // rather than hard-coding where SKY starts.
  const plain = (el.firstChild?.textContent ?? text).trim().length;

  /* Wider tracking than the stylesheet sets. Title card, not headline. */
  const track = (cs.letterSpacing.endsWith("px") ? parseFloat(cs.letterSpacing) : 0) + size * 0.035;
  const font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  probe.font = font;

  const advances = [...text].map((c) => probe.measureText(c).width);
  const inkW = advances.reduce((a, b) => a + b, 0) + track * (text.length - 1);

  const m = probe.measureText(text);
  const ascent = m.fontBoundingBoxAscent || size * 0.92;
  const descent = m.fontBoundingBoxDescent || size * 0.24;

  // Only the accent glow needs room now that the drop shadow is gone.
  const pad = size * (0.3 + d.markGlow * 0.55);
  const cssW = inkW + pad * 2;
  const cssH = ascent + descent + pad * 2;

  // Two device pixels per CSS pixel is the most any of this can show;
  // past 4096 across, cap rather than allocate.
  const ss = Math.min(2, 4096 / cssW);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cssW * ss);
  canvas.height = Math.round(cssH * ss);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(ss, ss);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const draw = (from: number, to: number) => {
    let x = pad;
    for (let i = 0; i < text.length; i++) {
      const glyph = text[i];
      const adv = advances[i];
      if (glyph === undefined || adv === undefined) continue;
      if (i >= from && i < to) ctx.fillText(glyph, x, pad + ascent);
      x += adv + track;
    }
  };

  const red = `#${tokens.primary.getHexString()}`;

  // SKY carries its own halo, drawn twice, which is what the bloom
  // pass catches. Everything else is flat ink: no lift, no shadow.
  if (d.markGlow > 0) {
    ctx.fillStyle = red;
    ctx.shadowColor = red;
    ctx.shadowBlur = size * d.markGlow;
    draw(plain, text.length);
    draw(plain, text.length);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  ctx.fillStyle = `#${tokens.ink.getHexString()}`;
  draw(0, plain);
  ctx.fillStyle = red;
  draw(plain, text.length);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  // Camera is on the axis at rest, so this is just the frustum
  // half-extents at the mark's depth. Baseline goes on EYE, the horizon.
  const dist = CAM_Z - d.markDepth;
  const halfH = dist * Math.tan(((FOV / 2) * Math.PI) / 180);
  const halfW = halfH * (width / height);

  const scale = (Math.min(MARK_WIDTH * d.markScale, 0.94) * 2 * halfW) / inkW;

  return {
    texture,
    width: cssW * scale,
    height: cssH * scale,
    position: [0, EYE + ((ascent - descent) / 2) * scale, d.markDepth],
    reach: Math.min(1, (inkW * scale) / 2 / halfW),
  };
}

/** Lives in Content because the window frame needs the result too. */
function useWordmark(tokens: Tokens, d: DebugState) {
  const { size } = useThree();
  const [fonts, setFonts] = useState(false);

  // Teko arrives over the network; measuring before it lands gives the
  // fallback's metrics and the mark settles at the wrong scale.
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && setFonts(true));
    return () => {
      live = false;
    };
  }, []);

  const mark = useMemo(
    () => buildWordmark(size.width, size.height, tokens, d),
    [size.width, size.height, tokens, fonts, d.markDepth, d.markScale, d.markGlow],
  );

  useEffect(() => {
    if (!mark) return;
    document.documentElement.dataset.sceneMark = "on";
    return () => {
      delete document.documentElement.dataset.sceneMark;
      mark.texture.dispose();
    };
  }, [mark]);

  return mark;
}

function Wordmark({ mark }: { mark: Mark | null }) {
  if (!mark) return null;

  return (
    <mesh position={mark.position} renderOrder={ORDER.wordmark}>
      <planeGeometry args={[mark.width, mark.height]} />
      {/* depthWrite off so it never occludes anything itself; depth
          TEST on so the towers between it and the camera cut across
          the letters. Slight transparency reads as night air. */}
      <meshBasicMaterial
        map={mark.texture}
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* Every panel is flat, in the plane z = GLASS_Z facing the camera:
   built as boxes running away from the glass, every interior surface
   goes edge-on and renders black. Opaque panels draw first. */

const RAMP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** A soft one-directional ramp: city light on interior surfaces. */
const RAMP_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uDir;
  void main() {
    float t = mix(vUv.y, 1.0 - vUv.y, uDir);
    float across = pow(clamp(t, 0.0, 1.0), 2.2);
    float along = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
    gl_FragColor = vec4(uColor, across * along * uIntensity);
  }
`;

/* Real glass at night is a half-mirror; leaving it clear is what
   makes a window look like a hole. */
const GLASS_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3 uSheen;
  uniform vec3 uWarm;

  void main() {
    vec2 p = vUv - 0.5;

    float a = smoothstep(0.30, 0.0, abs(p.x * 0.55 + p.y - 0.20));
    float b = smoothstep(0.17, 0.0, abs(p.x * 0.62 + p.y - 0.02));
    vec3 col = uSheen * (a * 0.028 + b * 0.016);

    float room = smoothstep(0.62, 0.0, length((p - vec2(-0.30, -0.30)) * vec2(1.0, 1.6)));
    col += uWarm * room * 0.016;

    float grazing = smoothstep(0.18, 0.55, length(p * vec2(1.0, 1.35)));
    col += uSheen * grazing * 0.009;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Window({ tokens, mark }: { tokens: Tokens; mark: Mark | null }) {
  const { size } = useThree();

  const aspect = Math.max(0.42, size.width / size.height);
  const halfW = GLASS_HALF_H * aspect;

  // Head dropped from 0.74: the site's own fixed bar covers the top
  // seventy pixels of the stage, which left the soffit looking cropped.
  const head = EYE + 0.64 * GLASS_HALF_H;
  const sill = EYE - 0.7 * GLASS_HALF_H;

  // Two thirds out, or clear of the wordmark, whichever is further.
  const clear = mark ? Math.min(0.94, mark.reach * 1.16) : 0;
  const mull = Math.max(0.66, clear) * halfW;

  const shell = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.hull,
        fog: false,
        toneMapped: false,
      }),
    [tokens],
  );

  /** Interior trim: ceiling, sill, mullion faces. Catches city light
      through the glass, so it is never black. */
  const trim = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.hull.clone().lerp(tokens.facade, 0.42),
        fog: false,
        toneMapped: false,
      }),
    [tokens],
  );

  const seam = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.hull.clone().lerp(tokens.facade, 0.16),
        fog: false,
        toneMapped: false,
      }),
    [tokens],
  );

  /** The cove light in the ceiling. Warm white, the way an office is,
      and the brightest surface in the room. */
  const cove = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.warm.clone().lerp(tokens.hullEdge, 0.45),
        fog: false,
        toneMapped: false,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [tokens],
  );

  const coveGlow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.warm.clone().lerp(tokens.hullEdge, 0.45),
        fog: false,
        toneMapped: false,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [tokens],
  );

  /** Cold edge, catching city light rather than emitting. */
  const edge = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.hullEdge,
        fog: false,
        toneMapped: false,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [tokens],
  );

  const lamp = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: tokens.primary,
        fog: false,
        toneMapped: false,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        /* Double-sided: a single-sided plane facing a few degrees the wrong
                   way is culled silently. */
        side: THREE.DoubleSide,
      }),
    [tokens],
  );

  const glass = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RAMP_VERT,
        fragmentShader: GLASS_FRAG,
        uniforms: {
          uSheen: { value: tokens.hullEdge.clone() },
          uWarm: { value: tokens.warm.clone() },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    [tokens],
  );

  const rampDown = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RAMP_VERT,
        fragmentShader: RAMP_FRAG,
        uniforms: {
          uColor: { value: tokens.skyHorizon.clone().lerp(tokens.warm, 0.18) },
          uIntensity: { value: 0.5 },
          uDir: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    [tokens],
  );

  const rampUp = useMemo(() => {
    const m = rampDown.clone();
    m.uniforms.uDir = { value: 1 };
    m.uniforms.uIntensity = { value: 0.34 };
    return m;
  }, [rampDown]);

  useEffect(
    () => () => {
      [shell, trim, seam, cove, coveGlow, edge, lamp, glass, rampDown, rampUp].forEach((m) =>
        m.dispose(),
      );
    },
    [shell, trim, seam, cove, coveGlow, edge, lamp, glass, rampDown, rampUp],
  );

  return (
    <group>
      {/* The pane. Over the city, under nothing. */}
      <mesh position={[0, EYE, GLASS_Z - 0.02]} material={glass} renderOrder={ORDER.glass}>
        <planeGeometry args={[halfW * 2.4, GLASS_HALF_H * 2.4]} />
      </mesh>

      <mesh position={[0, head + 3, GLASS_Z]} material={trim} renderOrder={ORDER.frame}>
        <planeGeometry args={[halfW * 4, 6]} />
      </mesh>
      {/* Everything above here must finish before EYE + GLASS_HALF_H
          (0.34 above head at this FOV) — past that these ran off the
          top of the frame and the soffit read as cropped. */}
      <mesh position={[0, head + 0.15, GLASS_Z + 0.006]} material={rampUp}>
        <planeGeometry args={[halfW * 4, 0.3]} />
      </mesh>
      {/* Ceiling joints. A large flat interior surface has no scale at
          all without them. */}
      {[0.09, 0.2].map((y) => (
        <mesh
          key={y}
          position={[0, head + y, GLASS_Z + 0.004]}
          material={seam}
          renderOrder={ORDER.frame}
        >
          <planeGeometry args={[halfW * 4, 0.016]} />
        </mesh>
      ))}
      <mesh position={[0, head + 0.045, GLASS_Z + 0.01]} material={coveGlow}>
        <planeGeometry args={[halfW * 1.9, 0.24]} />
      </mesh>
      <mesh position={[0, head + 0.045, GLASS_Z + 0.014]} material={cove}>
        <planeGeometry args={[halfW * 1.9, 0.022]} />
      </mesh>

      {/* The only red in the room. */}
      <mesh position={[-halfW * 0.42, head + 0.28, GLASS_Z + 0.012]} material={lamp}>
        <planeGeometry args={[0.42, 0.016]} />
      </mesh>

      <mesh position={[0, sill - 3, GLASS_Z]} material={shell} renderOrder={ORDER.frame}>
        <planeGeometry args={[halfW * 4, 6]} />
      </mesh>
      <mesh position={[0, sill - 0.42, GLASS_Z + 0.006]} material={rampDown}>
        <planeGeometry args={[halfW * 4, 0.84]} />
      </mesh>
      <mesh position={[0, sill - 0.008, GLASS_Z + 0.012]} material={edge}>
        <planeGeometry args={[halfW * 4, 0.02]} />
      </mesh>

      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * mull, EYE, GLASS_Z + 0.004]}
            material={trim}
            renderOrder={ORDER.frame}
          >
            <planeGeometry args={[0.075, GLASS_HALF_H * 3]} />
          </mesh>
          <mesh position={[s * mull - s * 0.046, EYE, GLASS_Z + 0.008]} material={edge}>
            <planeGeometry args={[0.014, GLASS_HALF_H * 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function View({ tier }: { tier: Tier }) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(0);

  // R3F aims the default camera at the origin, which pitches it down
  // and puts the horizon off the top of the frame. Zero it once.
  useEffect(() => {
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // Clamp the step so a stall — a tab regaining focus, a long task —
    // cannot teleport anything on the frame after it.
    const step = Math.min(dt, 1 / 30);

    intro.current = Math.min(1, intro.current + step / 2.2);
    const settle = 1 - Math.pow(1 - intro.current, 4);

    // Two sine pairs at incommensurate rates, so the drift never
    // visibly repeats and never reaches a rest position you can catch
    // it sitting at.
    const driftX = Math.sin(t * 0.19) * 0.026 + Math.sin(t * 0.47 + 2.1) * 0.007;
    const driftY = Math.sin(t * 0.15 + 1.4) * 0.018 + Math.sin(t * 0.55) * 0.005;

    // Parallax is cut off tier A, where "pointer" is usually a stale
    // tap position rather than a hand moving over the scene.
    const par = tier === "a" ? 1 : 0.35;

    camera.position.x = damp(camera.position.x, pointer.current.x * 0.16 * par + driftX, 2.6, step);
    camera.position.y = damp(
      camera.position.y,
      EYE - pointer.current.y * 0.07 * par + driftY,
      2.6,
      step,
    );
    // The opening move is a single slow settle toward the glass. It is
    // the only travel in the whole scene.
    camera.position.z = damp(camera.position.z, CAM_Z + (1 - settle) * 0.9, 3.4, step);
  });

  return null;
}

/** Renderer counters, dev only. Published to the DOM because browser
 * tooling in an isolated world cannot see page globals. */
function Counters() {
  const { gl } = useThree();
  const probe = useRef({ frames: 0, since: 0 });

  useEffect(() => {
    // three resets the counters at the start of every render(), and the
    // post chain does several per frame.
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
      delete document.documentElement.dataset.gl;
    };
  }, [gl]);

  useFrame((state) => {
    const p = probe.current;
    p.frames += 1;
    const now = state.clock.elapsedTime;
    if (now - p.since < 1) return;

    // Do NOT use useFrame's priority to order this after the render:
    // any subscriber above zero takes rendering over and the scene
    // silently stops drawing.
    document.documentElement.dataset.gl = [
      `calls:${Math.round(gl.info.render.calls / p.frames)}`,
      `tris:${Math.round(gl.info.render.triangles / p.frames)}`,
      `progs:${gl.info.programs?.length ?? 0}`,
      `geo:${gl.info.memory.geometries}`,
      `tex:${gl.info.memory.textures}`,
      `dpr:${gl.getPixelRatio().toFixed(2)}`,
    ].join(" ");

    gl.info.reset();
    p.frames = 0;
    p.since = now;
  });

  return null;
}

function Content({ tier }: { tier: Tier }) {
  const tokens = useTokens();
  const d = useDebug();
  const layout = useCityLayout(tier === "a" ? SITES : Math.round(SITES * 0.62));
  const lots = useSuburbs(tier === "a" ? SUBURBS : Math.round(SUBURBS * 0.3), tokens);
  const mark = useWordmark(tokens, d);

  const sun = useMemo(
    () => sunVector(d.sunElevation, d.sunAzimuth),
    [d.sunElevation, d.sunAzimuth],
  );

  // The dim lives in a uniform on a material three-stdlib shares
  // across instances, so it is set rather than passed.
  const sky = useRef<THREE.Object3D & { material: THREE.ShaderMaterial }>(null);
  useEffect(() => {
    const u = sky.current?.material.uniforms.uDim;
    if (u) u.value = d.skyDim;
  }, [d.skyDim]);

  return (
    <>
      {/* Drawn last of the opaque objects: its shader pins it to the
          far plane, so once downtown and the window frame have
          written depth this costs only the sky actually visible. */}
      <Sky
        // drei types Sky as its own prop set rather than as a mesh, so
        // the draw order, which is the whole point of putting it here,
        // has to go on through the ref.
        ref={(node) => {
          if (!node) return;
          node.renderOrder = ORDER.sky;
          dimSky(node.material as THREE.ShaderMaterial);
          sky.current = node as never;
        }}
        distance={4600}
        sunPosition={sun}
        turbidity={d.turbidity}
        rayleigh={d.rayleigh}
        mieCoefficient={0.006}
        mieDirectionalG={0.86}
      />
      <NightSky tokens={tokens} />
      <Starfield tier={tier} brightness={d.stars} />

      <Window tokens={tokens} mark={mark} />
      <City tokens={tokens} layout={layout} />
      <Suburbs lots={lots} />
      <Ground tokens={tokens} />
      <Beacons tokens={tokens} layout={layout} tier={tier} />
      <Wordmark mark={mark} />

      {/* Fly mode replaces the resting camera outright: two
          controllers writing camera.position in the same frame is a
          fight, and the one that loses is whichever ran first. */}
      {d.fly ? (
        <FlyControls movementSpeed={90} rollSpeed={0.45} dragToLook autoForward={false} />
      ) : (
        <View tier={tier} />
      )}

      {/* multisampling={0}: the composer defaults to 8x MSAA on its
          own target, which on a 2x display spends milliseconds on
          edge quality this soft-light scene can't show. */}
      {tier === "a" ? (
        <EffectComposer enableNormalPass={false} multisampling={0}>
          {/* Bloom's mipmap chain is the most expensive pass here and
              every tap is a blur, so running it at half width/height
              costs a quarter the fragments and looks the same. */}
          <Bloom
            intensity={d.bloom}
            luminanceThreshold={d.bloomThreshold}
            luminanceSmoothing={0.3}
            resolutionScale={0.5}
            mipmapBlur
          />
          <Vignette offset={0.2} darkness={d.vignette} eskil={false} />
        </EffectComposer>
      ) : null}

      {import.meta.env.DEV ? <Counters /> : null}
    </>
  );
}

export default function Scene({ tier }: { tier: Tier }) {
  const host = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const d = useDebug();

  // PerformanceMonitor drives the pixel ratio between these bounds:
  // a single ratio from the device tier is a guess, since the same
  // laptop on its own panel vs. a 4K display differs 4x in fragments.
  const range = tier === "a" ? { min: 1, max: 1.75 } : { min: 0.75, max: 1.25 };
  const [dpr, setDpr] = useState(range.min);

  // No scroll listener: the stage is one viewport tall at the top,
  // so the observer already fires when it leaves.
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let onScreen = true;
    const sync = () => setRunning(onScreen && !document.hidden);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "5% 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Hand crank for the render loop, dev only: rAF doesn't run in a
  // hidden page, so an automated check would otherwise only ever
  // screenshot a black canvas.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let t = performance.now();
    const tick = (e: Event) => {
      t += (e as CustomEvent<{ step?: number }>).detail?.step ?? 100;
      advance(t);
    };
    document.addEventListener("stage:tick", tick);
    return () => document.removeEventListener("stage:tick", tick);
  }, []);

  return (
    /* Fly mode is the one time the stage takes pointer events. */
    <div className={`stage${d.fly ? " stage--fly" : ""}`} ref={host} aria-hidden="true">
      <Canvas
        frameloop={running ? "always" : "never"}
        dpr={d.lockDpr ? d.dpr : dpr}
        /* antialias off: the composer renders to its own target, so canvas
                  MSAA is paid for and thrown away. */
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          /* Nothing here is tone mapped. Saying so keeps tier B, which has no
                    composer, identical to tier A. */
          toneMapping: THREE.NoToneMapping,
        }}
        // Near plane is half the z-fighting fix: at 0.1 the far blocks
        // resolve to about 2.5 units. Nothing in the room is closer than 2.2.
        camera={{ fov: FOV, near: 0.6, far: 5600, position: [0, EYE, 3.1] }}
      >
        {d.lockDpr ? null : (
          <PerformanceMonitor
            // Start at the bottom. The default 0.5 spends half the
            // budget before a frame has been measured.
            factor={0}
            // Both bounds sit below the refresh rate: a page keeping up
            // with 60Hz reports 59-point-something, so an upper bound
            // OF the refresh rate can never be crossed.
            bounds={(refresh) => [Math.min(refresh * 0.7, 45), Math.min(refresh * 0.92, 70)]}
            flipflops={3}
            onChange={({ factor }) =>
              setDpr(Math.round((range.min + factor * (range.max - range.min)) * 4) / 4)
            }
            onFallback={() => setDpr(range.min)}
          />
        )}
        <Content tier={tier} />
      </Canvas>
      {import.meta.env.DEV ? <Stats className="glstat-panel" /> : null}
    </div>
  );
}
