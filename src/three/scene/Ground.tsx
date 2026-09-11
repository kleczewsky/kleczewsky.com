import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDebug } from "../knobs";
import { BLOCK, CITY_FLOOR, ORDER } from "./constants";
import type { Tokens } from "./tokens";

const GROUND_VERT = /* glsl */ `
  varying vec3 vW;
  varying float vD;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vW = world.xyz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vD = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GROUND_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vW;
  varying float vD;
  uniform vec3 uDark;
  uniform vec3 uStreet;
  uniform vec3 uHaze;
  uniform vec3 uCool;
  uniform vec3 uTail;
  uniform float uBlock;
  uniform float uTime;
  uniform float uTraffic;
  uniform float uTrafficGlow;
  uniform float uTrafficDensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // One head with a short tail, running along a street. The exponent is
  // the dash length, held at a pixel or wider so it cannot strobe once
  // the spacing goes sub-pixel down the avenue.
  float dash(float along, float dir, float salt, float pitch, float lane) {
    float pace = 0.55 + 0.9 * hash(vec2(lane, 41.0));
    float u = along / pitch * dir - uTime * uTraffic * pace / pitch + salt;
    float px = max(fwidth(along) / pitch, 1e-5);

    // A car is a contour of constant u, so floor(u) is its identity and
    // holds while it runs. Empty slots and uneven brightness are what
    // stop the stream reading as a dotted line: how full a street is
    // varies too, so some run heavy and some nearly clear.
    float car = hash(vec2(floor(u), lane));
    float full = 0.34 + 0.3 * hash(vec2(lane, 3.3));
    float on = step(full, car) * (0.3 + 0.7 * fract(car * 7.31));

    return pow(fract(u), clamp(0.5 / px, 1.0, 12.0)) * on;
  }

  // Avenues only. The side streets are under a pixel across out here
  // and a streak on them is noise, not traffic.
  vec3 traffic(vec2 p, float period) {
    vec2 q = p / period;
    vec2 g = fwidth(q) * 0.8 + 1e-4;
    vec2 d = abs(fract(q + 0.5) - 0.5);
    vec2 m = (1.0 - smoothstep(vec2(0.0), g + 0.022, d)) * clamp(0.022 / g, 0.0, 1.0);

    vec2 id = floor(q + 0.5);
    float sz = hash(vec2(id.x, 1.7));
    float sx = hash(vec2(id.y, 8.3));
    float pitch = period * 2.2;

    // Only some avenues are running. Every street carrying a stream at
    // once reads as a texture over the whole grid, not as traffic.
    float cut = 1.0 - uTrafficDensity;
    m.x *= step(cut, hash(vec2(id.x, 17.3)));
    m.y *= step(cut, hash(vec2(id.y, 29.1)));

    float a = m.x * dash(p.y, sz < 0.5 ? -1.0 : 1.0, hash(vec2(id.x, 3.1)) * 9.0, pitch, id.x);
    float b = m.y * dash(p.x, sx < 0.5 ? -1.0 : 1.0, hash(vec2(id.y, 5.9)) * 9.0, pitch, id.y);

    // Colour follows the direction of travel: headlights one way down
    // the avenue, tail lights the other.
    return mix(uCool, uTail, step(0.5, sz)) * a + mix(uCool, uTail, step(0.5, sx)) * b;
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

      // Downtown is brighter than the outskirts, but the outskirts are
      // never dark. A suburb at night is a carpet of sodium, and that
      // carpet is what the low blocks out there are seen against.
      float core = 1.0 - smoothstep(
        240.0, 2400.0, length((vW.xz - vec2(0.0, -900.0)) * vec2(0.6, 1.0))
      );

      float lamp = ave * mix(0.34, 1.0, core);

      // Traffic: a slow travelling brightness per block run. It and
      // the windows are the only motion in the frame.
      float flow = 0.72 + 0.28 * sin(
        vW.x * 0.06 + vW.z * 0.04 + uTime * 0.5 + hash(floor(vW.xz / uBlock)) * 20.0
      );

      col += uStreet * lamp * flow * vis * 0.34;

      // Traffic gives out well before the lamps do: the dashes are the
      // first thing to cross a pixel.
      float near = 1.0 - smoothstep(900.0, 2600.0, vD);
      if (near > 0.004) col += traffic(vW.xz, uBlock) * near * vis * uTrafficGlow;
    }

    // Complete before the far plane, so the last visible row of ground
    // is already pure haze and reads as sky.
    col = mix(col, uHaze * 0.5, smoothstep(2800.0, 4600.0, vD));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Ground({ tokens }: { tokens: Tokens }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = useDebug();

  const uniforms = useMemo(
    () => ({
      uDark: { value: tokens.ground.clone().lerp(tokens.facade, 0.14) },
      uStreet: { value: tokens.street.clone() },
      uHaze: { value: tokens.haze.clone() },
      uCool: { value: tokens.cool.clone() },
      uTail: { value: tokens.primary.clone().lerp(tokens.street, 0.25) },
      uBlock: { value: BLOCK },
      uTime: { value: 0 },
      uTraffic: { value: d.trafficSpeed },
      uTrafficGlow: { value: d.trafficGlow },
      uTrafficDensity: { value: d.trafficDensity },
    }),
    [tokens, d.trafficSpeed, d.trafficGlow, d.trafficDensity],
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
        vertexShader={GROUND_VERT}
        fragmentShader={GROUND_FRAG}
      />
    </mesh>
  );
}
