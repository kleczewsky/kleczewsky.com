import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier } from "../../lib/tier";
import { useDebug } from "../knobs";
import { ORDER } from "./constants";
import type { Layout } from "./layout";
import type { Tokens } from "./tokens";

const BEACON_VERT = /* glsl */ `
  attribute float phase;
  varying float vOn;
  uniform float uTime;
  uniform float uScale;
  uniform float uDpr;
  void main() {
    float period = 1.5 + phase * 1.3;
    float cyc = fract(uTime / period + phase);
    float flash = smoothstep(0.4, 0.26, cyc) * smoothstep(0.0, 0.05, cyc);
    // A real obstruction light burns at a low steady intensity
    // between flashes; it never goes fully dark.
    vOn = max(flash, 0.3);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uScale / max(1.0, -mv.z), 1.4, 4.2) * uDpr;
    gl_Position = projectionMatrix * mv;
  }
`;

const BEACON_FRAG = /* glsl */ `
  varying float vOn;
  uniform vec3 uColor;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, core * core * vOn * 0.85);
  }
`;

/* The one red in the city. They do not blink in unison; real ones
   never do. */

export function Beacons({ tokens, layout, tier }: { tokens: Tokens; layout: Layout; tier: Tier }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const d = useDebug();
  const dpr = useThree((s) => s.viewport.dpr);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layout.beacons, 3));
    g.setAttribute("phase", new THREE.BufferAttribute(layout.phases, 1));
    return g;
  }, [layout]);

  useEffect(() => () => geo.dispose(), [geo]);

  // Tips are stored tallest first, so a draw range thins the field
  // from the low end up without touching the buffer.
  useEffect(() => {
    geo.setDrawRange(0, Math.min(d.beaconCount, layout.phases.length));
  }, [geo, d.beaconCount, layout]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: tokens.primary.clone() },
      uTime: { value: 0 },
      // Beacons sit 700-2200 out, so uScale/distance is the whole size
      // range. Under about 2000 every one lands on the lower clamp and
      // the field reads as one flat row of identical dots.
      uScale: { value: d.beaconSize * (tier === "a" ? 1 : 0.78) },
      uDpr: { value: dpr },
    }),
    [tokens, tier, dpr, d.beaconSize],
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
        vertexShader={BEACON_VERT}
        fragmentShader={BEACON_FRAG}
      />
    </points>
  );
}
