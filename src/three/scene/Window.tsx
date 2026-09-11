import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDebug } from "../knobs";
import { EYE, GLASS_HALF_H, GLASS_Z, ORDER } from "./constants";
import type { Mark } from "./Wordmark";
import type { Tokens } from "./tokens";

/* Recessed glazing behind solid frame profiles. Surface lighting is
   explicit so the room keeps its authored exposure without scene lights. */

const RAMP_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
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
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform vec3 uSheen;
  uniform vec3 uWarm;

  void main() {
    vec3 eye = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - abs(eye.z), 3.0);
    // Very faint interior reflection, moving with the actual camera.
    float streak = 1.0 - smoothstep(0.0, 0.13, abs(vUv.y - 0.87 + eye.y * 0.12));
    float edge = 1.0 - smoothstep(0.0, 0.035, min(vUv.x, 1.0 - vUv.x));
    float cove = streak * smoothstep(0.05, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 0.95, vUv.x));
    vec3 col = uSheen * (fresnel * 0.028 + edge * 0.006);
    col += uWarm * cove * 0.007;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const METAL_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      vec3 scale2 = vec3(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz),
                        dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz),
                        dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
      n = mat3(instanceMatrix) * (n / scale2);
    #endif
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * p;
  }
`;

const METAL_FRAG = /* glsl */ `
  varying vec3 vNormal;
  uniform vec3 uBase;
  uniform vec3 uLight;
  void main() {
    vec3 n = normalize(vNormal);
    float facing = max(0.0, dot(n, normalize(vec3(-0.45, 0.75, 0.48))));
    float sky = max(0.0, n.z) * 0.16;
    gl_FragColor = vec4(uBase * (0.38 + facing * 1.4) + uLight * (facing * 0.14 + sky), 1.0);
  }
`;

/** Blind drop per bay: left, centre, right, as a share of blindDrop. */
const BAY_DROP = [1, 0.66, 0.82] as const;

/** Headrail depth, and half the mullion width the bays inset by. */
const RAIL = 0.05;
const MULL_HALF = 0.038;

type Bay = { key: string; x: number; w: number; drop: number };

function BlindSlats({
  bays,
  head,
  pitch,
  material,
}: {
  bays: Bay[];
  head: number;
  pitch: number;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const part = new THREE.Object3D();
    return bays.flatMap((bay) => {
      const count = Math.max(1, Math.round(bay.drop / pitch));
      const spacing = bay.drop / count;
      return Array.from({ length: count }, (_, i) => {
        part.position.set(bay.x, head - RAIL - spacing * (i + 0.5), GLASS_Z + 0.1);
        part.rotation.set(-0.22, 0, 0);
        part.scale.set(bay.w, spacing * 0.52, 0.065);
        part.updateMatrix();
        return part.matrix.clone();
      });
    });
  }, [bays, head, pitch]);

  useEffect(() => {
    if (!ref.current) return;
    matrices.forEach((matrix, i) => ref.current!.setMatrixAt(i, matrix));
    ref.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, material, matrices.length]}
      renderOrder={ORDER.frame}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/** Interior surfaces, keyed by what they are rather than by the order
 * they happen to be built in. Disposed as one bank. */
function useSurfaces(tokens: Tokens, glow: number) {
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
      metal: new THREE.ShaderMaterial({
        vertexShader: METAL_VERT,
        fragmentShader: METAL_FRAG,
        uniforms: {
          uBase: { value: tokens.facade.clone().multiplyScalar(0.48) },
          uLight: { value: tokens.hullEdge.clone().multiplyScalar(0.18) },
        },
        fog: false,
      }),
      blind: new THREE.ShaderMaterial({
        vertexShader: METAL_VERT,
        fragmentShader: METAL_FRAG,
        uniforms: {
          uBase: { value: tokens.facade.clone().multiplyScalar(0.5) },
          uLight: { value: coveColor.clone().multiplyScalar(glow * 0.6) },
        },
        fog: false,
      }),
      rampDown,
      rampUp,
    };
  }, [tokens, glow]);

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
  const s = useSurfaces(tokens, d.blindLight);

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
      {/* Separate recessed panes; the solid profiles occlude their edges. */}
      {bays.map((bay) => (
        <mesh
          key={bay.key}
          position={[bay.x, (head + sill) / 2, GLASS_Z - 0.045]}
          material={s.glass}
          renderOrder={ORDER.glass}
        >
          <planeGeometry args={[bay.w, head - sill]} />
        </mesh>
      ))}

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
      {/* A projecting ledge, with a shaded underside and a thin front lip. */}
      <mesh
        position={[0, sill - 0.055, GLASS_Z + 0.17]}
        material={s.metal}
        renderOrder={ORDER.frame}
      >
        <boxGeometry args={[halfW * 4, 0.11, 0.42]} />
      </mesh>
      <mesh position={[0, sill - 0.09, GLASS_Z + 0.39]} material={s.trim} renderOrder={ORDER.frame}>
        <boxGeometry args={[halfW * 4, 0.036, 0.032]} />
      </mesh>
      <mesh position={[0, sill - 0.42, GLASS_Z + 0.006]} material={s.rampDown}>
        <planeGeometry args={[halfW * 4, 0.84]} />
      </mesh>
      <mesh position={[0, sill - 0.008, GLASS_Z + 0.012]} material={s.edge}>
        <planeGeometry args={[halfW * 4, 0.02]} />
      </mesh>

      <BlindSlats bays={bays} head={head} pitch={d.blindPitch} material={s.blind} />
      {bays.map((bay) => (
        <group key={bay.key} position={[bay.x, 0, 0]}>
          <mesh
            position={[0, head - RAIL / 2 + 0.006, GLASS_Z + 0.1]}
            material={s.metal}
            renderOrder={ORDER.frame}
          >
            <boxGeometry args={[bay.w, RAIL + 0.012, 0.18]} />
          </mesh>
          <mesh
            position={[0, head - RAIL - bay.drop, GLASS_Z + 0.1]}
            material={s.metal}
            renderOrder={ORDER.frame}
          >
            <boxGeometry args={[bay.w, 0.025, 0.08]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * bay.w * 0.3, head - RAIL - bay.drop / 2, GLASS_Z + 0.14]}
              material={s.trim}
              renderOrder={ORDER.frame}
            >
              <boxGeometry args={[0.006, bay.drop, 0.006]} />
            </mesh>
          ))}
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * mull, EYE, GLASS_Z + 0.06]}
            material={s.metal}
            renderOrder={ORDER.frame}
          >
            <boxGeometry args={[0.082, GLASS_HALF_H * 3, 0.24]} />
          </mesh>
          <mesh
            position={[side * mull, EYE, GLASS_Z + 0.19]}
            material={s.trim}
            renderOrder={ORDER.frame}
          >
            <boxGeometry args={[0.052, GLASS_HALF_H * 3, 0.025]} />
          </mesh>
          {[-1, 1].map((edge) => (
            <mesh
              key={edge}
              position={[side * mull + edge * 0.047, EYE, GLASS_Z - 0.01]}
              material={s.shell}
              renderOrder={ORDER.frame}
            >
              <boxGeometry args={[0.012, GLASS_HALF_H * 3, 0.05]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
