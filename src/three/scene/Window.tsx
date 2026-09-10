import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDebug } from "../knobs";
import { EYE, GLASS_HALF_H, GLASS_Z, ORDER } from "./constants";
import type { Mark } from "./Wordmark";
import type { Tokens } from "./tokens";

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

/* Raised venetian blinds. Slats are struck from world Y rather than
   from uv, so one material serves bays of three different drops. */
const BLIND_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vY;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BLIND_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying float vY;
  uniform vec3 uSlat;
  uniform vec3 uLight;
  uniform float uPitch;
  uniform float uGlow;

  void main() {
    // fwidth of a wrapped value spikes at the seam, so slat width in
    // pixels comes off the unwrapped coordinate.
    float px = fwidth(vY) / uPitch;
    float f = fract(vY / uPitch);

    // A cosine lobe is smooth across the wrap where a sawtooth is not,
    // which is the difference between still slats and crawling ones.
    float face = pow(0.5 - 0.5 * cos(6.2831853 * f), 1.35);
    float seam = smoothstep(0.0, clamp(px * 2.0, 0.04, 0.5), min(f, 1.0 - f));
    float lit = face * mix(0.3, 1.0, seam);

    // Past half a pixel per slat the pattern cannot be resolved at all,
    // so settle on its mean rather than keep point-sampling it.
    lit = mix(lit, 0.36, smoothstep(0.25, 0.5, px));

    float wash = mix(0.5, 1.0, vUv.y);
    gl_FragColor = vec4(uSlat + uLight * lit * wash * uGlow, 1.0);
  }
`;

/** Blind drop per bay: left, centre, right, as a share of blindDrop. */
const BAY_DROP = [1, 0.66, 0.82] as const;

/** Headrail depth, and half the mullion width the bays inset by. */
const RAIL = 0.05;
const MULL_HALF = 0.038;

/** Interior surfaces, keyed by what they are rather than by the order
 * they happen to be built in. Disposed as one bank. */
function useSurfaces(tokens: Tokens, pitch: number, glow: number) {
  const bank = useMemo(() => {
    const basic = (color: THREE.Color, extra: THREE.MeshBasicMaterialParameters = {}) =>
      new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false, ...extra });

    const coveColor = tokens.warm.clone().lerp(tokens.hullEdge, 0.45);
    const lifted = { transparent: true, depthWrite: false, side: THREE.DoubleSide } as const;

    const rampDown = new THREE.ShaderMaterial({
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
    });

    const rampUp = rampDown.clone();
    rampUp.uniforms.uDir = { value: 1 };
    rampUp.uniforms.uIntensity = { value: 0.34 };

    return {
      shell: basic(tokens.hull),
      /** Ceiling, sill, mullion faces. Catches city light through the
          glass, so it is never black. */
      trim: basic(tokens.hull.clone().lerp(tokens.facade, 0.42)),
      /** The cove light in the ceiling. Warm white, the way an office
          is, and the brightest surface in the room. Double-sided: a
          single-sided plane facing a few degrees the wrong way is
          culled silently. */
      cove: basic(coveColor, { ...lifted, opacity: 0.88 }),
      coveGlow: basic(coveColor, { ...lifted, opacity: 0.12, blending: THREE.AdditiveBlending }),
      /** Cold edge, catching city light rather than emitting. */
      edge: basic(tokens.hullEdge, { ...lifted, opacity: 0.3 }),
      glass: new THREE.ShaderMaterial({
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
      blind: new THREE.ShaderMaterial({
        vertexShader: BLIND_VERT,
        fragmentShader: BLIND_FRAG,
        uniforms: {
          uSlat: { value: tokens.hull.clone().lerp(tokens.facade, 0.2) },
          uLight: { value: tokens.warm.clone().lerp(tokens.hullEdge, 0.45) },
          uPitch: { value: pitch },
          uGlow: { value: glow },
        },
        fog: false,
      }),
      rampDown,
      rampUp,
    };
  }, [tokens, pitch, glow]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(bank)) m.dispose();
    };
  }, [bank]);

  return bank;
}

export function Window({ tokens, mark }: { tokens: Tokens; mark: Mark | null }) {
  const { size } = useThree();
  const d = useDebug();
  const s = useSurfaces(tokens, d.blindPitch, d.blindLight);

  const aspect = Math.max(0.42, size.width / size.height);
  const halfW = GLASS_HALF_H * aspect;

  // 0.85 puts the blind headrail level with the bottom of the site's
  // fixed bar on the full-bleed layout; higher shows no more blind.
  const head = EYE + 0.85 * GLASS_HALF_H;
  const sill = EYE - 0.7 * GLASS_HALF_H;

  // Two thirds out, or clear of the wordmark, whichever is further.
  const clear = mark ? Math.min(0.94, mark.reach * 1.16) : 0;
  const mull = Math.max(0.66, clear) * halfW;

  const bays = useMemo(() => {
    const outer = halfW * 1.6;
    const inner = mull + MULL_HALF;
    const side = outer - inner;
    return [
      { key: "l", x: -(outer + inner) / 2, w: side, drop: d.blindDrop * BAY_DROP[0] },
      { key: "c", x: 0, w: (mull - MULL_HALF) * 2, drop: d.blindDrop * BAY_DROP[1] },
      { key: "r", x: (outer + inner) / 2, w: side, drop: d.blindDrop * BAY_DROP[2] },
    ];
  }, [halfW, mull, d.blindDrop]);

  return (
    <group>
      {/* The pane. Over the city, under nothing. */}
      <mesh position={[0, EYE, GLASS_Z - 0.02]} material={s.glass} renderOrder={ORDER.glass}>
        <planeGeometry args={[halfW * 2.4, GLASS_HALF_H * 2.4]} />
      </mesh>

      <mesh position={[0, head + 3, GLASS_Z]} material={s.trim} renderOrder={ORDER.frame}>
        <planeGeometry args={[halfW * 4, 6]} />
      </mesh>
      {/* The ramp is transparent at its far end, so it may run off the
          top; the cove line is what has to stay in frame. */}
      <mesh position={[0, head + 0.15, GLASS_Z + 0.006]} material={s.rampUp}>
        <planeGeometry args={[halfW * 4, 0.3]} />
      </mesh>
      <mesh position={[0, head + 0.045, GLASS_Z + 0.01]} material={s.coveGlow}>
        <planeGeometry args={[halfW * 4, 0.24]} />
      </mesh>
      <mesh position={[0, head + 0.045, GLASS_Z + 0.014]} material={s.cove}>
        <planeGeometry args={[halfW * 4, 0.022]} />
      </mesh>

      <mesh position={[0, sill - 3, GLASS_Z]} material={s.shell} renderOrder={ORDER.frame}>
        <planeGeometry args={[halfW * 4, 6]} />
      </mesh>
      <mesh position={[0, sill - 0.42, GLASS_Z + 0.006]} material={s.rampDown}>
        <planeGeometry args={[halfW * 4, 0.84]} />
      </mesh>
      <mesh position={[0, sill - 0.008, GLASS_Z + 0.012]} material={s.edge}>
        <planeGeometry args={[halfW * 4, 0.02]} />
      </mesh>

      {bays.map((bay) => (
        <group key={bay.key} position={[bay.x, 0, 0]}>
          <mesh
            position={[0, head - RAIL - bay.drop / 2, GLASS_Z + 0.002]}
            material={s.blind}
            renderOrder={ORDER.frame}
          >
            <planeGeometry args={[bay.w, bay.drop]} />
          </mesh>
          <mesh
            position={[0, head - RAIL / 2 + 0.006, GLASS_Z + 0.003]}
            material={s.trim}
            renderOrder={ORDER.frame}
          >
            <planeGeometry args={[bay.w, RAIL + 0.012]} />
          </mesh>
          <mesh
            position={[0, head - RAIL - bay.drop, GLASS_Z + 0.003]}
            material={s.trim}
            renderOrder={ORDER.frame}
          >
            <planeGeometry args={[bay.w, 0.032]} />
          </mesh>
          <mesh position={[0, head - RAIL - bay.drop - 0.021, GLASS_Z + 0.006]} material={s.edge}>
            <planeGeometry args={[bay.w, 0.012]} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * mull, EYE, GLASS_Z + 0.004]}
            material={s.trim}
            renderOrder={ORDER.frame}
          >
            <planeGeometry args={[0.075, GLASS_HALF_H * 3]} />
          </mesh>
          <mesh
            position={[side * mull - side * 0.046, EYE, GLASS_Z + 0.008]}
            material={s.edge}
          >
            <planeGeometry args={[0.014, GLASS_HALF_H * 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
