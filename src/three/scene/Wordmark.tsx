import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { DebugState } from "../knobs";
import { CAM_Z, CITY_FLOOR, EYE, FOV, ORDER } from "./constants";
import type { Tokens } from "./tokens";

/* The typeface is read off the DOM heading's computed style, so the
   wordmark in the scene and the one a no-WebGL visitor reads are the
   same. The h1 stays in the document; only its ink fades. */

export type Mark = {
  texture: THREE.CanvasTexture;
  /** Texture boundaries between letters, preserving the original spacing. */
  glyphEdges: number[];
  width: number;
  height: number;
  position: [number, number, number];
  /** Visible glyph bounds, excluding the transparent texture padding. */
  inkWidth: number;
  inkHeight: number;
  inkBottom: number;
  /** How far the letters reach from centre, as a fraction of the half
   * width. The mullions are placed from it. */
  reach: number;
};

/** Share of the full frame width the letters take at scale 1. */
const MARK_WIDTH = 0.56;

/** A redraw allocates a canvas up to 4096 across and uploads it, so a
 * drag-resize must not run one per frame. */
const RESIZE_SETTLE = 180;

/** The three knobs the mark is actually drawn from. Passed as values
 * rather than the whole DebugState so the memo below can list exactly
 * what it depends on. */
type MarkKnobs = Pick<DebugState, "markDepth" | "markScale" | "markGlow">;

function buildWordmark(width: number, height: number, tokens: Tokens, d: MarkKnobs): Mark | null {
  // h1, not just the attribute: the flag this sets lives on <html>,
  // and [data-wordmark] alone matched the root element first.
  const el = document.querySelector<HTMLElement>("h1[data-wordmark]");
  if (!el || width < 2 || height < 2) return null;

  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  if (!Number.isFinite(size) || size < 4) return null;

  const text = el.textContent?.trim().toUpperCase() ?? "";
  if (!text) return null;
  // The accent is the trailing span. Read the split point off the DOM
  // rather than hard-coding where SKY starts.
  const plain = (el.firstChild?.textContent ?? text).trim().length;

  /* Wider tracking than the stylesheet sets. Title card, not headline. */
  const track = (cs.letterSpacing.endsWith("px") ? parseFloat(cs.letterSpacing) : 0) + size * 0.035;
  const font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  probe.font = font;

  const advances = [...text].map((c) => probe.measureText(c).width);
  const inkW = advances.reduce((a, b) => a + b, 0) + track * (text.length - 1);

  const m = probe.measureText(text);
  const ascent = m.fontBoundingBoxAscent || size * 0.92;
  const descent = m.fontBoundingBoxDescent || size * 0.24;

  // Only the accent glow needs room now that the drop shadow is gone.
  const pad = size * (0.3 + d.markGlow * 0.55);
  const cssW = inkW + pad * 2;
  const cssH = ascent + descent + pad * 2;

  // Two device pixels per CSS pixel is the most any of this can show;
  // past 4096 across, cap rather than allocate.
  const ss = Math.min(2, 4096 / cssW);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cssW * ss);
  canvas.height = Math.round(cssH * ss);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(ss, ss);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const draw = (from: number, to: number) => {
    let x = pad;
    for (let i = 0; i < text.length; i++) {
      const glyph = text[i];
      const adv = advances[i];
      if (glyph === undefined || adv === undefined) continue;
      if (i >= from && i < to) ctx.fillText(glyph, x, pad + ascent);
      x += adv + track;
    }
  };

  const red = `#${tokens.primary.getHexString()}`;

  // SKY carries its own halo, drawn twice, which is what the bloom
  // pass catches. Everything else is flat ink: no lift, no shadow.
  if (d.markGlow > 0) {
    ctx.fillStyle = red;
    ctx.shadowColor = red;
    ctx.shadowBlur = size * d.markGlow;
    draw(plain, text.length);
    draw(plain, text.length);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  ctx.fillStyle = `#${tokens.ink.getHexString()}`;
  draw(0, plain);
  ctx.fillStyle = red;
  draw(plain, text.length);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  // Camera is on the axis at rest, so this is just the frustum
  // half-extents at the mark's depth. Baseline goes on EYE, the horizon.
  const dist = CAM_Z - d.markDepth;
  const halfH = dist * Math.tan(((FOV / 2) * Math.PI) / 180);
  const halfW = halfH * (width / height);

  const scale = (Math.min(MARK_WIDTH * d.markScale, 0.94) * 2 * halfW) / inkW;

  let cursor = pad;
  const glyphEdges = [0];
  for (let i = 0; i < advances.length - 1; i++) {
    cursor += advances[i]! + track;
    glyphEdges.push((cursor - track / 2) / cssW);
  }
  glyphEdges.push(1);

  return {
    texture,
    glyphEdges,
    width: cssW * scale,
    height: cssH * scale,
    position: [0, EYE + ((ascent - descent) / 2) * scale, d.markDepth],
    inkWidth: inkW * scale,
    inkHeight: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * scale,
    inkBottom: EYE - m.actualBoundingBoxDescent * scale,
    reach: Math.min(1, (inkW * scale) / 2 / halfW),
  };
}

/** The live canvas size on mount, then only once a resize has stopped. */
function useSettledSize() {
  const { size } = useThree();
  const [settled, setSettled] = useState({ width: size.width, height: size.height });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setSettled({ width: size.width, height: size.height });
      return;
    }
    const id = window.setTimeout(
      () => setSettled({ width: size.width, height: size.height }),
      RESIZE_SETTLE,
    );
    return () => window.clearTimeout(id);
  }, [size.width, size.height]);

  return settled;
}

/** Lives in Content because the window frame needs the result too. */
export function useWordmark(tokens: Tokens, d: DebugState, page: string | null) {
  const size = useSettledSize();
  const { markDepth, markScale, markGlow } = d;
  const request = useMemo(
    () => ({
      page,
      width: size.width,
      height: size.height,
      tokens,
      markDepth,
      markScale,
      markGlow,
    }),
    [page, size.width, size.height, tokens, markDepth, markScale, markGlow],
  );
  const [built, setBuilt] = useState<{ request: typeof request; mark: Mark | null } | null>(null);

  // The canvas survives route changes. Measure after the DOM commit, not
  // during render, when the previous page's heading can still be present.
  useEffect(() => {
    let live = true;
    let frame = 0;
    let created: Mark | null = null;
    if (request.page !== null) {
      void document.fonts.ready.then(() => {
        if (!live) return;
        frame = requestAnimationFrame(() => {
          if (!live) return;
          created = buildWordmark(request.width, request.height, request.tokens, request);
          setBuilt({ request, mark: created });
        });
      });
    }
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      created?.texture.dispose();
    };
  }, [request]);

  // Never show a cached home texture on another page, even while its
  // replacement effect is still pending.
  const mark = page !== null && built?.request === request ? built.mark : null;

  // Distinguish a pending rebuild from a failed texture. Only failure
  // should bring back the HTML heading once the scene is already visible.
  useEffect(() => {
    if (page === null || built?.request !== request) return;
    document.documentElement.dataset.sceneMark = mark ? "on" : "unavailable";
    return () => {
      delete document.documentElement.dataset.sceneMark;
    };
  }, [page, built, request, mark]);

  return mark;
}

/** Each letter is a quad from the same texture; the whole word stays one draw call. */
export function Wordmark({ mark, shown }: { mark: Mark | null; shown: boolean }) {
  const elapsed = useRef(0);
  const previous = useRef<Mark | null>(null);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const uniforms = useMemo(() => ({ time: { value: 0 }, drop: { value: 0 } }), []);
  const geometry = useMemo(() => {
    if (!mark) return null;
    const positions: number[] = [];
    const uvs: number[] = [];
    const letters: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < mark.glyphEdges.length - 1; i++) {
      const left = mark.glyphEdges[i]!;
      const right = mark.glyphEdges[i + 1]!;
      const x0 = (left - 0.5) * mark.width;
      const x1 = (right - 0.5) * mark.width;
      const h = mark.height / 2;
      positions.push(x0, -h, 0, x1, -h, 0, x1, h, 0, x0, h, 0);
      uvs.push(left, 0, right, 0, right, 1, left, 1);
      letters.push(i, i, i, i);
      const v = i * 4;
      indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("aLetter", new THREE.Float32BufferAttribute(letters, 1));
    g.setIndex(indices);
    return g;
  }, [mark]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRiseTime = uniforms.time;
      shader.uniforms.uDrop = uniforms.drop;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute float aLetter;
          uniform float uRiseTime;
          uniform float uDrop;
        `,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float progress = clamp((uRiseTime - aLetter * 0.035) / 1.0, 0.0, 1.0);
          // A restrained ease-out-back: a small crest, then a slow settle.
          float tail = progress - 1.0;
          float rise = 1.0 + 1.8 * tail * tail * tail + 0.8 * tail * tail;
          float remaining = 1.0 - rise;
          transformed.y -= uDrop * remaining;
        `,
        );
    };
    m.customProgramCacheKey = () => "wordmark-rise-v1";
    return m;
  }, [uniforms]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    if (previous.current !== mark) {
      previous.current = mark;
      elapsed.current = 0;
    }
    if (!mark) return;
    // Begin below the city floor. Existing depth testing lets rooftops
    // obscure the letters naturally as they rise into their final position.
    uniforms.drop.value = mark.position[1] + mark.height / 2 - CITY_FLOOR + 20;
    if (shown) elapsed.current = Math.min(2, elapsed.current + Math.min(dt, 1 / 30));
    uniforms.time.value = reduced ? 2 : elapsed.current;
  });

  if (!mark || !geometry) return null;
  return (
    <mesh
      position={mark.position}
      geometry={geometry}
      renderOrder={ORDER.wordmark}
      frustumCulled={false}
    >
      <primitive object={material} attach="material" map={mark.texture} />
    </mesh>
  );
}
