import { useEffect, useRef } from "react";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Tier } from "../../lib/tier";
import { DEBUG } from "../knobs";
import { ORDER } from "./constants";
import { smoothstep } from "./math";

/* Preetham has no exposure of its own, and the renderer's tone
   mapping exposure is a dead end on tier A: the postprocessing
   composer takes tone mapping over. Hence dimSky(). */

/* three-stdlib's Sky shares ONE material across every instance, so
   this patches the class. Must run before the first compile; the
   guard is for StrictMode and hot reload. */
export function dimSky(mat: THREE.ShaderMaterial) {
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

export function sunVector(elevation: number, azimuth: number) {
  const el = (elevation * Math.PI) / 180;
  const az = (azimuth * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/* drei's vertex shader transforms points with w = 0.5, doubling the
   effective radius. The shell has to be placed short of where you
   want it or the field lands past the far plane. */
const STAR_RADIUS = 2400;
const STAR_DEPTH = 200;

export function Starfield({ tier, brightness }: { tier: Tier; brightness: number }) {
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
