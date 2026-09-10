import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { DebugState } from "../knobs";
import { CAM_Z, EYE, FOV, ORDER } from "./constants";
import type { Tokens } from "./tokens";

/* The typeface is read off the DOM heading's computed style, so the
   wordmark in the scene and the one a no-WebGL visitor reads are the
   same. The h1 stays in the document; only its ink fades. */

export type Mark = {
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  position: [number, number, number];
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

  return {
    texture,
    width: cssW * scale,
    height: cssH * scale,
    position: [0, EYE + ((ascent - descent) / 2) * scale, d.markDepth],
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
export function useWordmark(tokens: Tokens, d: DebugState) {
  const size = useSettledSize();
  const [fonts, setFonts] = useState(false);

  // Teko arrives over the network; measuring before it lands gives the
  // fallback's metrics and the mark settles at the wrong scale.
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && setFonts(true));
    return () => {
      live = false;
    };
  }, []);

  const { markDepth, markScale, markGlow } = d;

  const mark = useMemo(
    // fonts is not read in here. It flips once when Teko lands, and
    // the glyph metrics measured inside change with it.
    () => buildWordmark(size.width, size.height, tokens, { markDepth, markScale, markGlow }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [size.width, size.height, tokens, fonts, markDepth, markScale, markGlow],
  );

  // Says only that the scene HAS a mark. Whether the DOM heading may
  // fade needs the reveal as well, which Stage flags separately.
  useEffect(() => {
    if (!mark) return;
    document.documentElement.dataset.sceneMark = "on";
    return () => {
      delete document.documentElement.dataset.sceneMark;
      mark.texture.dispose();
    };
  }, [mark]);

  return mark;
}

export function Wordmark({ mark }: { mark: Mark | null }) {
  if (!mark) return null;

  return (
    <mesh position={mark.position} renderOrder={ORDER.wordmark}>
      <planeGeometry args={[mark.width, mark.height]} />
      {/* depthWrite off so it never occludes anything itself; depth
          TEST on so the towers between it and the camera cut across
          the letters. Slight transparency reads as night air. */}
      <meshBasicMaterial
        map={mark.texture}
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
