import { useEffect } from "react";

/* One window listener for the whole scene. The camera rig and the
   airship both track the pointer, and both ran their own. */

export type Pointer = {
  /** Viewport-normalised, -1 to 1. */
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  /** False until the pointer has actually moved. Hit tests must not
   * run before it: 0,0 is a real corner of the canvas, not "nowhere". */
  moved: boolean;
};

const pointer: Pointer = { x: 0, y: 0, clientX: 0, clientY: 0, moved: false };
let listeners = 0;

function onMove(e: PointerEvent) {
  pointer.clientX = e.clientX;
  pointer.clientY = e.clientY;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.moved = true;
}

export function usePointer(): Pointer {
  useEffect(() => {
    if (listeners++ === 0) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (--listeners === 0) window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return pointer;
}

/** An element's rect, re-read only when the page could have moved it.
 * Reading it per pointer event forced a layout on every move. */
export function trackRect(el: HTMLElement) {
  let value: DOMRect | null = null;
  const clear = () => {
    value = null;
  };

  window.addEventListener("scroll", clear, { passive: true });
  window.addEventListener("resize", clear);

  return {
    read: () => (value ??= el.getBoundingClientRect()),
    /** For the click path, where a rect one layout stale is a missed
     * hit rather than one frame of the wrong cursor. */
    fresh: () => (value = el.getBoundingClientRect()),
    dispose() {
      window.removeEventListener("scroll", clear);
      window.removeEventListener("resize", clear);
    },
  };
}
