import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ORDER } from "./constants";
import type { Lots } from "./layout";

/* Buildings never move and the camera never travels, so both buffers
   upload once and distance haze is baked into the colour on the CPU. */

export function Suburbs({ lots }: { lots: Lots }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const inst = mesh.current;
    if (!inst) return;
    inst.instanceMatrix.array.set(lots.matrices);
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor = new THREE.InstancedBufferAttribute(lots.colors, 3);
    inst.count = lots.count;
  }, [lots]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(1, lots.count)]}
      renderOrder={ORDER.suburbs}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial fog={false} toneMapped={false} />
    </instancedMesh>
  );
}
