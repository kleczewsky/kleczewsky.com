import { useMemo } from "react";
import * as THREE from "three";

function tokenColor(style: CSSStyleDeclaration, name: string, fallback: string) {
  return new THREE.Color(style.getPropertyValue(name).trim() || fallback);
}

export function useTokens() {
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

export type Tokens = ReturnType<typeof useTokens>;
