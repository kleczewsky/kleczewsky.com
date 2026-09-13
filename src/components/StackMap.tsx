import { useEffect, useRef, useState } from "react";
import { useLocale } from "../lib/locale";
import "./StackMap.css";

const NODES = [
  { item: 1, label: "PHP / Laravel", symbol: "{}" },
  { item: 2, label: "Livewire / Filament", symbol: "↯" },
  { item: 5, label: "MySQL / Redis", symbol: "▤" },
  { item: 6, label: "API", symbol: "↔" },
  { item: 3, label: "React / TypeScript", symbol: "◎" },
  { item: 4, label: "WebGL / three.js", symbol: "◇" },
  { item: 7, label: "Frontend", symbol: "</>" },
  { item: 8, label: null, symbol: "/_" },
  { item: 0, label: null, symbol: "✳" },
];

/** Shared dictionary content keeps the visual map and agent profile in sync. */
export function StackMap() {
  const { t, locale } = useLocale();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let onScreen = false;
    const sync = () => setVisible(onScreen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = !!entry?.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const polish = locale === "pl";
  const label = (node: (typeof NODES)[number]) =>
    node.label ??
    (node.item === 0 ? (polish ? "Ludzie" : "People") : polish ? "Narzędzia" : "Workflow");

  return (
    <div
      ref={container}
      className={`stack-map${visible ? " is-visible" : ""}${paused ? " is-paused" : ""}`}
    >
      <div className="stack-map-top t-micro">
        <span>{polish ? "Mój warsztat" : "My toolkit"}</span>
        <span className="stack-map-controls">
          {polish ? "Wybierz obszar" : "Select an area"} <span aria-hidden="true">↗</span>
          <button
            className="stack-map-motion"
            type="button"
            aria-pressed={paused}
            aria-label={polish ? "Wstrzymaj animacje" : "Pause animations"}
            onClick={() => setPaused(!paused)}
          >
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          </button>
        </span>
      </div>
      <div className="stack-map-board" role="group" aria-label={t.stack.mark}>
        <div className="stack-map-atmosphere" aria-hidden="true">
          <span className="stack-map-radar" />
        </div>
        <svg
          className="stack-map-wires"
          viewBox="0 0 1000 460"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {NODES.map((node, i) => {
            const left = i < 4;
            const y = i === 8 ? 396 : 65 + (i % 4) * 86;
            const path =
              i === 8
                ? "M500 230 V396"
                : `M${left ? 170 : 830} ${y} H${left ? 290 : 710} L${left ? 415 : 585} 230 H500`;
            return (
              <g key={node.item} className={active === i ? "is-active" : ""}>
                <path d={path} className="stack-map-wire" />
                <path d={path} className="stack-map-signal" pathLength="100" />
              </g>
            );
          })}
        </svg>
        <div className="stack-map-hub" aria-hidden="true">
          <span className="stack-map-hub-orbit" />
          <span className="stack-map-hub-ring" />
          <span key={active} className="stack-map-burst" />
          <span className="stack-map-hub-face">
            <img src="/favicon.svg" alt="" width="64" height="64" />
          </span>
        </div>
        {NODES.map((node, i) => (
          <button
            key={node.item}
            type="button"
            className={`stack-map-node stack-map-node--${i}${active === i ? " is-active" : ""}`}
            aria-pressed={active === i}
            aria-controls={`stack-detail-${node.item}`}
            onClick={() => setActive(i)}
          >
            <span className="stack-map-symbol" aria-hidden="true">
              {node.symbol}
            </span>
            <span className="stack-map-node-name">{label(node)}</span>
            <span className="stack-map-node-index" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>
      <div className="stack-map-details" aria-live="polite" aria-atomic="true">
        {NODES.map((node, i) => (
          <div key={node.item} id={`stack-detail-${node.item}`} hidden={active !== i}>
            <span className="t-micro stack-map-detail-index">
              {String(i + 1).padStart(2, "0")} / 09
            </span>
            <h3 className="t-title">{t.stack.items[node.item]?.term}</h3>
            <p className="t-body">{t.stack.items[node.item]?.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
