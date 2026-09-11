import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { FlyControls, Sky } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Tier } from "../lib/tier";
import { useDebug } from "./knobs";
import { ORDER, SITES, SUBURBS } from "./scene/constants";
import { useCityLayout, useSuburbs } from "./scene/layout";
import { useTokens } from "./scene/tokens";
import { Starfield, dimSky, sunVector } from "./scene/Sky";
import { Ground } from "./scene/Ground";
import { City } from "./scene/City";
import { Suburbs } from "./scene/Suburbs";
import { Beacons } from "./scene/Beacons";
import { Blimp } from "./scene/Blimp";
import { Fireworks } from "./scene/Fireworks";
import { Wordmark, useWordmark } from "./scene/Wordmark";
import { Window } from "./scene/Window";
import { View } from "./scene/View";
import { Counters } from "./scene/Counters";

/** The composer's passes are not in the scene graph and only link on
 * its first run, so compileAsync alone does not cover them. */
const SETTLE_FRAMES = 2;

/** Links every program before the canvas is faded up: left to the
 * first drawn frame, ~33 of them link mid-reveal. */
function Reveal({ onReady, onLost }: { onReady: () => void; onLost: () => void }) {
  const { gl, scene, camera } = useThree();
  const compiled = useRef(false);
  const frames = useRef(0);

  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) compiled.current = true;
    };
    // Fireworks hide themselves on their first frame and compile()
    // walks only visible objects, so this has to run before then.
    const pending = gl.compileAsync?.(scene, camera);
    if (pending) pending.then(done, done);
    else {
      gl.compile(scene, camera);
      done();
    }
    return () => {
      live = false;
    };
  }, [gl, scene, camera]);

  // A driver reset takes the context with it. Hand the frame back to
  // the gradient and the DOM heading, which is the tier C composition
  // and stands on its own, rather than leaving an empty hero with the
  // headline already faded out.
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onLost]);

  useFrame(() => {
    if (!compiled.current || frames.current > SETTLE_FRAMES) return;
    if (++frames.current === SETTLE_FRAMES) onReady();
  });

  return null;
}

export default function Content({
  tier,
  onReady,
  onLost,
}: {
  tier: Tier;
  onReady: () => void;
  onLost: () => void;
}) {
  const tokens = useTokens();
  const d = useDebug();
  const volley = useRef(-1e4);
  const layout = useCityLayout(tier === "a" ? SITES : Math.round(SITES * 0.62));
  const lots = useSuburbs(tier === "a" ? SUBURBS : Math.round(SUBURBS * 0.3), tokens);
  const mark = useWordmark(tokens, d);
  const ready = useRef(false);

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
      <Starfield tier={tier} brightness={d.stars} />

      <Window tokens={tokens} mark={mark} />
      <City tokens={tokens} layout={layout} volley={volley} />
      <Suburbs lots={lots} />
      <Ground tokens={tokens} />
      <Beacons tokens={tokens} layout={layout} tier={tier} />
      <Blimp tokens={tokens} tier={tier} volley={volley} />
      <Fireworks tokens={tokens} layout={layout} tier={tier} volley={volley} />
      <Wordmark mark={mark} />

      {/* Fly mode replaces the resting camera outright: two
          controllers writing camera.position in the same frame is a
          fight, and the one that loses is whichever ran first. */}
      {d.fly ? (
        <FlyControls movementSpeed={90} rollSpeed={0.45} dragToLook autoForward={false} />
      ) : (
        <View active={ready} />
      )}

      <Reveal
        onReady={() => {
          ready.current = true;
          onReady();
        }}
        onLost={() => {
          ready.current = false;
          onLost();
        }}
      />

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
