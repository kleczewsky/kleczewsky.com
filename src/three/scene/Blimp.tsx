import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier } from "../../lib/tier";
import { useDebug } from "../knobs";
import { CAM_Z, FIRE_RUN, FOV, ORDER } from "./constants";
import { smoothstep } from "./math";
import { trackRect, usePointer } from "./pointer";
import type { Tokens } from "./tokens";

/** Behind the wordmark plane, so the letters cross in front of it. */
const BLIMP_Z = -2100;

/** Where it stands at t = 0, as a share of the half width. The mark
 * reaches 0.42 either side, so this is just outside the K, closing. */
const BLIMP_START = -0.56;

/** Hull profile, x running tail to nose over -1 to 1. The exponents
 * are how blunt each end is; unequal, they put the widest point a
 * third back from the nose, and 1.0772 is the maximum they reach,
 * which normalises r to 1. */
function hullRadius(x: number) {
  return (Math.pow(1 - x, 0.42) * Math.pow(1 + x, 0.85)) / 1.0772;
}

export function Blimp({
  tokens,
  tier,
  volley,
}: {
  tokens: Tokens;
  tier: Tier;
  volley: RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const d = useDebug();
  const { size, camera, gl, clock } = useThree();
  const pointer = usePointer();

  const hull = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 18; i++) {
      const x = -1 + i / 9;
      pts.push(new THREE.Vector2(Math.max(hullRadius(x), 1e-4) * 0.085, x * 0.5));
    }
    const g = new THREE.LatheGeometry(pts, 14);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  const skin = useMemo(
    () => new THREE.MeshBasicMaterial({ color: tokens.ground, fog: false, toneMapped: false }),
    [tokens],
  );

  useEffect(
    () => () => {
      hull.dispose();
      skin.dispose();
      document.body.style.cursor = "";
    },
    [hull, skin],
  );

  // A 6:1 hull is nine pixels tall on the band. Pick against a padded
  // box rather than the geometry, or it cannot be hit while moving.
  const grab = useMemo(
    () => new THREE.Vector3(d.blimpSize, d.blimpSize * 0.42, d.blimpSize * 0.42),
    [d.blimpSize],
  );

  // main paints over the stage with a background of its own, so a click
  // never reaches the canvas and r3f never picks. Its eventSource prop
  // is the supported way round that, but it drops the canvas offset and
  // every hit lands --scene-top too high. Own raycast off the rect.
  const hit = useMemo(() => {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const box = new THREE.Box3();
    const rect = trackRect(gl.domElement);

    return {
      dispose: rect.dispose,
      over(clientX: number, clientY: number, exact = false) {
        const g = group.current;
        if (!g) return false;
        const r = exact ? rect.fresh() : rect.read();
        if (r.width === 0 || r.height === 0) return false;
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return false;
        ray.setFromCamera(ndc, camera);
        box.setFromCenterAndSize(g.position, grab);
        return ray.ray.intersectsBox(box);
      },
    };
  }, [camera, gl, grab]);

  useEffect(() => () => hit.dispose(), [hit]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      // A second trigger mid-volley snaps the window dim back to full
      // and teleports every spark, so the run has to finish first.
      // Negative counts as finished: r3f zeroes clock.elapsedTime every
      // time the frameloop resumes, which otherwise leaves a start time
      // from before the pause parked in the future forever.
      const t = clock.elapsedTime;
      const since = t - volley.current;
      if ((since < 0 || since > FIRE_RUN) && hit.over(e.clientX, e.clientY, true))
        volley.current = t;
    };

    window.addEventListener("click", click);
    return () => window.removeEventListener("click", click);
  }, [clock, volley, hit]);

  // Wrap at the frame edge for the aspect actually in use, so a wide
  // band does not lose it off screen for minutes at a time.
  const { span, start } = useMemo(() => {
    const halfH = (CAM_Z - BLIMP_Z) * Math.tan(((FOV / 2) * Math.PI) / 180);
    const halfW = halfH * (size.width / Math.max(1, size.height));
    return { span: halfW + d.blimpSize, start: halfW * BLIMP_START };
  }, [size.width, size.height, d.blimpSize]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // Reduced motion lands on tier c, where it holds station instead.
    const t = tier === "c" ? 0 : state.clock.elapsedTime;

    g.position.x = ((t * d.blimpSpeed + span + start) % (span * 2)) - span;
    g.position.y = d.blimpAlt + Math.sin(t * 0.11) * 4;
    g.rotation.z = Math.sin(t * 0.09) * 0.02;

    // Hover in the frame loop, not on the pointer event: it costs one
    // pick per drawn frame instead of one per move, and it stops
    // entirely while the stage is off screen and the loop is parked.
    if (pointer.moved) {
      const want = hit.over(pointer.clientX, pointer.clientY) ? "pointer" : "";
      if (document.body.style.cursor !== want) document.body.style.cursor = want;
    }

    const m = lamp.current;
    if (!m) return;
    const cyc = t / 2.2 - Math.floor(t / 2.2);
    m.opacity = Math.max(smoothstep(0.4, 0.26, cyc) * smoothstep(0, 0.05, cyc), 0.25) * 0.9;
  });

  const l = d.blimpSize;

  return (
    <group ref={group} position={[0, d.blimpAlt, BLIMP_Z]}>
      <mesh geometry={hull} material={skin} scale={l} renderOrder={ORDER.city} />
      <mesh material={skin} renderOrder={ORDER.city} position={[-l * 0.4, 0, 0]}>
        <boxGeometry args={[l * 0.13, l * 0.16, l * 0.005]} />
      </mesh>
      <mesh material={skin} renderOrder={ORDER.city} position={[-l * 0.4, 0, 0]}>
        <boxGeometry args={[l * 0.13, l * 0.005, l * 0.16]} />
      </mesh>
      <mesh material={skin} renderOrder={ORDER.city} position={[l * 0.13, -l * 0.095, 0]}>
        <boxGeometry args={[l * 0.15, l * 0.035, l * 0.045]} />
      </mesh>
      <mesh position={[-l * 0.05, -l * 0.105, 0]} renderOrder={ORDER.blimp}>
        <circleGeometry args={[l * 0.022, 10]} />
        <meshBasicMaterial
          ref={lamp}
          color={tokens.primary}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
