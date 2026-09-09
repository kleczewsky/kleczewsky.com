import { useEffect, useState } from "react";
import { DEBUG, resetDebug, setDebug, useDebug, type DebugState } from "./knobs";
import "./Debug.css";

/* Scene panel, dev only. Hand-rolled rather than a controls package:
   forty lines of range inputs, and nothing added to what a visitor
   downloads. */

const DEFAULTS: DebugState = { ...DEBUG };

type Row =
  | { kind: "slider"; key: keyof DebugState; label: string; min: number; max: number; step: number }
  | { kind: "toggle"; key: keyof DebugState; label: string };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "camera",
    rows: [
      { kind: "toggle", key: "fly", label: "fly" },
      { kind: "toggle", key: "lockDpr", label: "lock dpr" },
      { kind: "slider", key: "dpr", label: "dpr", min: 0.5, max: 2, step: 0.05 },
    ],
  },
  {
    title: "post",
    rows: [
      { kind: "slider", key: "bloom", label: "bloom", min: 0, max: 2, step: 0.01 },
      { kind: "slider", key: "bloomThreshold", label: "threshold", min: 0, max: 1, step: 0.01 },
      { kind: "slider", key: "vignette", label: "vignette", min: 0, max: 1.6, step: 0.01 },
    ],
  },
  {
    title: "sky",
    rows: [
      { kind: "slider", key: "skyDim", label: "dim", min: 0, max: 1, step: 0.005 },
      { kind: "slider", key: "sunElevation", label: "sun el", min: -4, max: 8, step: 0.05 },
      { kind: "slider", key: "sunAzimuth", label: "sun az", min: -180, max: 180, step: 1 },
      { kind: "slider", key: "turbidity", label: "turbidity", min: 0.5, max: 16, step: 0.1 },
      { kind: "slider", key: "rayleigh", label: "rayleigh", min: 0, max: 8, step: 0.05 },
      { kind: "slider", key: "stars", label: "stars", min: 0, max: 4, step: 0.02 },
    ],
  },
  {
    title: "wordmark",
    rows: [
      { kind: "slider", key: "markDepth", label: "depth", min: -3200, max: -60, step: 10 },
      { kind: "slider", key: "markScale", label: "scale", min: 0.4, max: 3, step: 0.01 },
      { kind: "slider", key: "markGlow", label: "glow", min: 0, max: 1.2, step: 0.01 },
    ],
  },
];

function format(value: number) {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

export default function Debug() {
  const state = useDebug();
  const [open, setOpen] = useState(() => localStorage.getItem("scene:panel") !== "closed");

  useEffect(() => {
    localStorage.setItem("scene:panel", open ? "open" : "closed");
  }, [open]);

  // Backtick toggles the panel, so a screenshot never has to include it.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.metaKey && !e.ctrlKey) setOpen((v) => !v);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  /** Copyable straight back into knobs.ts, which is the point. */
  const copy = () => {
    const body = (Object.keys(DEFAULTS) as (keyof DebugState)[])
      .map((k) => `  ${k}: ${JSON.stringify(DEBUG[k])},`)
      .join("\n");
    void navigator.clipboard?.writeText(`{\n${body}\n}`);
  };

  return (
    <div className={`dbg t-micro${open ? "" : " dbg--shut"}`}>
      <div className="dbg-bar">
        <button type="button" onClick={() => setOpen((v) => !v)}>
          scene {open ? "−" : "+"}
        </button>
        {open ? (
          <>
            <button type="button" onClick={copy}>
              copy
            </button>
            <button type="button" onClick={() => resetDebug(DEFAULTS)}>
              reset
            </button>
          </>
        ) : null}
      </div>

      {open ? (
        <div className="dbg-body">
          {GROUPS.map((group) => (
            <fieldset key={group.title} className="dbg-group">
              <legend>{group.title}</legend>
              {group.rows.map((row) =>
                row.kind === "toggle" ? (
                  <label key={row.key} className="dbg-row dbg-row--toggle">
                    <input
                      type="checkbox"
                      checked={state[row.key] as boolean}
                      onChange={(e) => setDebug(row.key, e.target.checked as never)}
                    />
                    <span>{row.label}</span>
                  </label>
                ) : (
                  <label key={row.key} className="dbg-row">
                    <span className="dbg-name">{row.label}</span>
                    <input
                      type="range"
                      min={row.min}
                      max={row.max}
                      step={row.step}
                      value={state[row.key] as number}
                      onChange={(e) => setDebug(row.key, Number(e.target.value) as never)}
                    />
                    <span className="dbg-val">{format(state[row.key] as number)}</span>
                  </label>
                ),
              )}
            </fieldset>
          ))}

          {state.fly ? (
            <p className="dbg-hint">
              WASD move &middot; drag look &middot; R/F up/down &middot; shift faster
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
