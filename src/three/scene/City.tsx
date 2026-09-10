import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDebug } from "../knobs";
import { CITY_FLOOR, FIRE_RUN, ORDER } from "./constants";
import { smoothstep } from "./math";
import type { Layout } from "./layout";
import type { Tokens } from "./tokens";

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
  uniform float uDim;

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

      // Amber, with a minority of cool-white offices. NEVER red. Red
      // windows read as alarm, and red here belongs to the obstruction
      // lights, the ceiling strip and the wordmark alone.
      vec3 lamp = mix(uWarm, uCool, step(0.84, hash(id.yx + vSeed * 11.0)));
      float bright = 0.42 + 0.58 * fract(k * 7.31 + self);

      col += lamp * win * lit * bright * 1.05 * uDim;
    }

    col *= mix(1.0, 0.07, far);
    col = mix(col, uHaze * 0.3, far * far * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function City({
  tokens,
  layout,
  volley,
}: {
  tokens: Tokens;
  layout: Layout;
  volley: RefObject<number>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mastMesh = useRef<THREE.InstancedMesh>(null);
  const roofMesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = useDebug();

  const uniforms = useMemo(
    () => ({
      uFacade: { value: tokens.facade.clone() },
      uWarm: { value: tokens.warm.clone() },
      uCool: { value: tokens.cool.clone() },
      uHaze: { value: tokens.haze.clone() },
      uTime: { value: 0 },
      uFloor: { value: CITY_FLOOR },
      uDim: { value: 1 },
    }),
    [tokens],
  );

  useFrame((state) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const t = state.clock.elapsedTime;
    if (u.uTime) u.uTime.value = t;

    const since = t - volley.current;
    const fall = smoothstep(0, 0.7, since) * smoothstep(FIRE_RUN, FIRE_RUN - 2.4, since);
    if (u.uDim) u.uDim.value = 1 - d.fireDim * fall;
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
