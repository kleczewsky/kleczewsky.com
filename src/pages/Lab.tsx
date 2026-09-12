import { useEffect, useRef, useState } from "react";
import { RouteLink, useLocale } from "../lib/locale";
import { LAB_COPY, type ExperimentKind } from "../lab/copy";
import { createInstrument, type Instrument } from "../lab/engine";
import { newGame, type GameState } from "../lab/game";
import { DEFAULT_PARTICLE_PHYSICS, PARTICLE_PHYSICS_RANGES } from "../lab/particles";
import "./Lab.css";

function Preview({ kind }: { kind: ExperimentKind }) {
  return (
    <svg
      className={`lab-preview lab-preview--${kind}`}
      viewBox="0 0 160 96"
      fill="none"
      aria-hidden="true"
    >
      {kind === "orbit" &&
        Array.from({ length: 100 }, (_, i) => (
          <circle
            key={i}
            cx={80 + (56 * Math.cos(i * 0.06283)) / (1 + Math.sin(i * 0.06283) ** 2)}
            cy={
              48 +
              (62 * Math.sin(i * 0.06283) * Math.cos(i * 0.06283)) /
                (1 + Math.sin(i * 0.06283) ** 2)
            }
            r={i % 11 === 0 ? 1.7 : 0.6}
            fill={i % 11 === 0 ? "#ffe9ef" : "currentColor"}
            opacity={0.4 + (i % 5) * 0.12}
          />
        ))}
      {kind === "chrome" && (
        <>
          <defs>
            <linearGradient id="lab-chrome-light" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fff5ed" />
              <stop offset=".3" stopColor="#626a74" />
              <stop offset=".5" stopColor="#15121a" />
              <stop offset=".58" stopColor="#e9edf0" />
              <stop offset="1" stopColor="#f42d51" />
            </linearGradient>
          </defs>
          <path
            d="M51 25C67 8 86 18 89 29C123 9 143 40 123 56C143 83 110 96 93 75C58 99 29 72 44 53C22 49 31 23 51 25Z"
            fill="url(#lab-chrome-light)"
          />
          <circle cx="25" cy="76" r="9" fill="url(#lab-chrome-light)" />
        </>
      )}
      {kind === "lock" && (
        <>
          <circle
            cx="80"
            cy="48"
            r="35"
            stroke="currentColor"
            opacity=".25"
            strokeDasharray="1 3"
          />
          <circle cx="80" cy="48" r="27" stroke="currentColor" opacity=".3" />
          <path d="M 96 26 A 27 27 0 0 1 107 48" stroke="currentColor" strokeWidth="6" />
          <path d="M80 13V30" stroke="#fff" strokeWidth="2" />
          <circle cx="80" cy="48" r="2" fill="currentColor" />
        </>
      )}
      {kind === "foundry" && (
        <g fontFamily="var(--f-display)" fontWeight="600" fontSize="64">
          <text x="25" y="79" fill="currentColor" transform="rotate(-13 45 55)">
            A
          </text>
          <text x="70" y="57" fill="#e9e5dd" transform="rotate(15 87 40)">
            B
          </text>
          <text x="105" y="84" fill="currentColor" transform="rotate(-7 122 65)">
            C
          </text>
        </g>
      )}
      {kind === "mirror" &&
        Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="80"
            cy="31"
            rx="10"
            ry="22"
            stroke="currentColor"
            transform={`rotate(${i * 45} 80 48)`}
            opacity=".6"
          />
        ))}
      {kind === "breaker" && (
        <>
          <g fill="currentColor">
            {Array.from({ length: 15 }, (_, i) => (
              <rect
                key={i}
                x={25 + (i % 5) * 23}
                y={17 + Math.floor(i / 5) * 13}
                width="19"
                height="8"
                opacity={1 - Math.floor(i / 5) * 0.2}
              />
            ))}
            <rect x="62" y="78" width="38" height="3" />
          </g>
          <circle cx="97" cy="62" r="3" fill="#fff" />
        </>
      )}
    </svg>
  );
}

function Workbench({ index }: { index: number }) {
  const { locale } = useLocale();
  const c = LAB_COPY[locale];
  const experiment = c.experiments[index] ?? c.experiments[0];
  const kind = experiment.id;
  const isGame = kind === "lock" || kind === "breaker";
  const isGrabToy = kind === "chrome" || kind === "foundry";
  const keyboard = kind === "mirror" ? c.drawKeyboard : isGrabToy ? c.grabKeyboard : c.keyboard;
  const drawing = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const instrument = useRef<Instrument>(null);
  const scheduler = useRef<() => void>(() => {});
  const pausedRef = useRef(true);
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const [paused, setPaused] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [available, setAvailable] = useState(true);
  const [parameter, setParameter] = useState(42);
  const [form, setForm] = useState(0);
  const [physics, setPhysics] = useState(DEFAULT_PARTICLE_PHYSICS);
  const [word, setWord] = useState("PLAY");
  const [game, setGame] = useState<GameState>(newGame);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bestKey = kind === "lock" ? "kleczewsky:lab:orbit-best" : "kleczewsky:lab:breaker-best";
    const engine = createInstrument(el, kind, (value) => {
      setGame(value);
      if (kind === "lock" || kind === "breaker")
        setBest((previous) => {
          const next = Math.max(previous, value.score);
          if (next > previous) {
            try {
              localStorage.setItem(bestKey, String(next));
            } catch {
              /* Storage is optional. */
            }
          }
          return next;
        });
    });
    instrument.current = engine;
    // oxlint-disable-next-line react/set-state-in-effect
    setAvailable(Boolean(engine));
    if (!engine) return;
    pausedRef.current = media.matches;
    setPaused(media.matches);
    setReduced(media.matches);
    if (kind === "lock" || kind === "breaker") {
      try {
        const value = Number(localStorage.getItem(bestKey));
        if (Number.isSafeInteger(value) && value >= 0) setBest(value);
      } catch {
        /* Keep the game playable without storage. */
      }
    }
    let visible = false;
    let raf = 0;
    let last = 0;
    let frames = 0;
    let drawCost = 0;
    const interval = kind === "chrome" ? 1000 / 30 : 1000 / 60;
    const frame = (now: number) => {
      if (now - last >= interval - 1) {
        const start = import.meta.env.DEV ? performance.now() : 0;
        engine.draw(last ? Math.min((now - last) / 1000, 0.05) : 0);
        if (import.meta.env.DEV) {
          drawCost += performance.now() - start;
          frames++;
          if (frames % 30 === 0) {
            el.dataset.drawMs = (drawCost / 30).toFixed(2);
            el.dataset.frames = String(frames);
            drawCost = 0;
          }
        }
        last = now;
      }
      raf = requestAnimationFrame(frame);
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (visible && !document.hidden && !pausedRef.current) raf = requestAnimationFrame(frame);
    };
    scheduler.current = schedule;
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        schedule();
      },
      { threshold: 0.05 },
    );
    const resize = new ResizeObserver(() => engine.resize());
    const motionChange = () => {
      setReduced(media.matches);
      if (media.matches) {
        pausedRef.current = true;
        setPaused(true);
        schedule();
      }
    };
    engine.resize();
    intersection.observe(el);
    resize.observe(el);
    document.addEventListener("visibilitychange", schedule);
    media.addEventListener("change", motionChange);
    return () => {
      cancelAnimationFrame(raf);
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      media.removeEventListener("change", motionChange);
      engine.dispose();
      instrument.current = null;
      scheduler.current = () => {};
    };
  }, [kind]);

  const setPlaying = (play: boolean) => {
    pausedRef.current = !play;
    setPaused(!play);
    scheduler.current();
  };
  const action = () => {
    if (!instrument.current) return;
    if (pausedRef.current && isGame && game.status === "running") {
      setPlaying(true);
      return;
    }
    instrument.current.action();
    if (pausedRef.current) setPlaying(true);
  };
  const selectForm = (formIndex: number) => {
    setForm(formIndex);
    instrument.current?.form(formIndex);
    if (pausedRef.current) setPlaying(true);
  };
  const move = (x: number, y: number) => {
    pointer.current = { x, y };
    instrument.current?.move(x, y);
    if (pausedRef.current) instrument.current?.draw();
  };
  const gameMessage =
    game.status === "won"
      ? c.won
      : kind === "breaker"
        ? game.status === "miss"
          ? c.miss
          : game.status === "running"
            ? c.playing
            : c.breakerHint
        : game.status === "ready"
          ? c.ready
          : game.status === "miss"
            ? c.miss
            : game.score
              ? game.perfect
                ? c.perfect
                : c.hit
              : c.gameHint;
  const actionLabel = !isGame
    ? experiment.action
    : game.status === "ready"
      ? c.start
      : game.status === "miss" || game.status === "won"
        ? c.again
        : paused
          ? c.resume
          : kind === "breaker"
            ? c.pause
            : c.lock;

  return (
    <section className={`lab-workbench lab-workbench--${kind}`} aria-labelledby="experiment-title">
      <div className="lab-monitor">
        <div className="lab-monitor-bar t-micro">
          <span>
            EK—0{index + 1} <span className="lab-bar-slash">/</span> {experiment.name}
          </span>
          <span className={`lab-live${paused ? " is-paused" : ""}`}>
            <i />
            {paused ? c.paused : c.live}
          </span>
        </div>
        <div className={`lab-screen${kind === "lock" ? " lab-screen--game" : ""}`}>
          <canvas
            ref={canvas}
            className="lab-canvas"
            tabIndex={0}
            role="button"
            aria-label={`${experiment.name}. ${experiment.instruction}. ${keyboard}`}
            aria-describedby="experiment-instruction"
            onClick={(event) => {
              if (event.detail === 0 && kind !== "mirror" && !isGrabToy) action();
            }}
            onPointerMove={(event) => {
              if (event.pointerType === "touch" && event.buttons === 0) return;
              const rect = event.currentTarget.getBoundingClientRect();
              move(
                (event.clientX - rect.left) / rect.width,
                (event.clientY - rect.top) / rect.height,
              );
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const rect = event.currentTarget.getBoundingClientRect();
              move(
                (event.clientX - rect.left) / rect.width,
                (event.clientY - rect.top) / rect.height,
              );
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.focus({ preventScroll: true });
              instrument.current?.press(true);
              if (kind === "mirror" || isGrabToy) {
                drawing.current = true;
                if (pausedRef.current) setPlaying(true);
              } else action();
            }}
            onPointerUp={() => {
              instrument.current?.press(false);
              drawing.current = false;
            }}
            onLostPointerCapture={() => {
              instrument.current?.press(false);
              drawing.current = false;
            }}
            onPointerCancel={() => {
              instrument.current?.leave();
              drawing.current = false;
            }}
            onPointerLeave={() => {
              instrument.current?.leave();
              drawing.current = false;
            }}
            onBlur={() => {
              instrument.current?.leave();
              drawing.current = false;
            }}
            onKeyDown={(event) => {
              if (
                [" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              )
                event.preventDefault();
              if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                if (kind === "mirror" || isGrabToy) {
                  drawing.current = !drawing.current;
                  instrument.current?.press(drawing.current);
                  if (pausedRef.current) setPlaying(true);
                } else action();
              }
              const p = pointer.current;
              if (event.key.startsWith("Arrow"))
                move(
                  Math.max(
                    0,
                    Math.min(
                      1,
                      p.x +
                        (event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0),
                    ),
                  ),
                  Math.max(
                    0,
                    Math.min(
                      1,
                      p.y +
                        (event.key === "ArrowUp" ? -0.05 : event.key === "ArrowDown" ? 0.05 : 0),
                    ),
                  ),
                );
            }}
          >
            {c.unavailable}
          </canvas>
          {!available && <p className="lab-unavailable">{c.unavailable}</p>}
          <span className="lab-screen-coord t-micro" aria-hidden="true">
            EXPERIMENT / 00{index + 1}
          </span>
          {kind === "lock" && (
            <div className="lab-game-centre" aria-hidden="true">
              <span>{String(game.score).padStart(2, "0")}</span>
              <small className="t-micro">{c.score}</small>
            </div>
          )}
          <span className="lab-screen-cross" aria-hidden="true">
            +
          </span>
          <p id="experiment-instruction" className="lab-screen-hint t-micro">
            {experiment.instruction}
          </p>
        </div>
        <div className="lab-transport">
          <span className="lab-transport-mark t-micro" aria-hidden="true">
            ▰ ▰ ▰ <span>EXP. 0{index + 1}</span>
          </span>
          <div>
            <button type="button" disabled={!available} onClick={() => setPlaying(paused)}>
              <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> {paused ? c.resume : c.pause}
            </button>
            <button
              type="button"
              disabled={!available}
              onClick={() => {
                instrument.current?.reset();
                setForm(0);
                setPhysics(DEFAULT_PARTICLE_PHYSICS);
                setWord("PLAY");
                pointer.current = { x: 0.5, y: 0.5 };
                setParameter(42);
                instrument.current?.adjust(0.42);
                instrument.current?.draw();
              }}
            >
              <span aria-hidden="true">↺</span> {c.reset}
            </button>
          </div>
        </div>
      </div>
      <aside className="lab-console">
        <p className="t-micro t-primary">{experiment.category}</p>
        <h2 id="experiment-title">{experiment.name}</h2>
        <p className="lab-description">{experiment.description}</p>
        {kind === "foundry" && (
          <form
            className="lab-word"
            onSubmit={(event) => {
              event.preventDefault();
              if (!word.trim()) return;
              instrument.current?.text(word);
              if (pausedRef.current) setPlaying(true);
            }}
          >
            <label htmlFor="lab-word">{c.wordLabel}</label>
            <div>
              <input
                id="lab-word"
                value={word}
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                disabled={!available}
                onChange={(event) => setWord(event.target.value)}
              />
              <button type="submit" disabled={!available || !word.trim()}>
                {c.stamp}
              </button>
            </div>
          </form>
        )}
        {kind === "orbit" && (
          <div className="lab-forms" role="group" aria-label={c.formLabel}>
            {c.forms.map((name, formIndex) => (
              <button
                key={name}
                type="button"
                disabled={!available}
                aria-pressed={form === formIndex}
                onClick={() => selectForm(formIndex)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {isGame ? (
          <>
            <dl className="lab-scoreboard">
              <div>
                <dt>{kind === "breaker" ? c.bricks : c.score}</dt>
                <dd>{String(game.score).padStart(2, "0")}</dd>
              </div>
              <div>
                <dt>{c.best}</dt>
                <dd>{String(best).padStart(2, "0")}</dd>
              </div>
            </dl>
            <p
              className={`lab-game-message${game.status === "miss" ? " is-miss" : ""}`}
              role="status"
            >
              {gameMessage}
            </p>
          </>
        ) : (
          <div className="lab-parameters">
            <div className="lab-parameter">
              <label htmlFor="lab-parameter">
                <span>{experiment.parameter}</span>
                <output aria-hidden="true">
                  {kind === "mirror"
                    ? 3 + Math.round(parameter * 0.09)
                    : String(parameter).padStart(2, "0")}
                </output>
              </label>
              <input
                id="lab-parameter"
                type="range"
                min={kind === "mirror" ? 3 : 0}
                max={kind === "mirror" ? 12 : 100}
                value={kind === "mirror" ? 3 + Math.round(parameter * 0.09) : parameter}
                disabled={!available}
                onChange={(event) => {
                  const value =
                    kind === "mirror"
                      ? ((Number(event.target.value) - 3) / 9) * 100
                      : Number(event.target.value);
                  setParameter(value);
                  instrument.current?.adjust(value / 100);
                  if (pausedRef.current) instrument.current?.draw();
                }}
              />
              <div className="lab-range-labels t-micro">
                <span>{experiment.low}</span>
                <span>{experiment.high}</span>
              </div>
            </div>
            {kind === "orbit" && (
              <div className="lab-physics">
                {(["spring", "damping"] as const).map((key) => (
                  <div className="lab-parameter" key={key}>
                    <label htmlFor={`lab-${key}`}>
                      <span>{c.physics[key].label}</span>
                      <output aria-hidden="true">{physics[key]}</output>
                    </label>
                    <input
                      id={`lab-${key}`}
                      type="range"
                      {...PARTICLE_PHYSICS_RANGES[key]}
                      value={physics[key]}
                      disabled={!available}
                      onChange={(event) => {
                        const next = { ...physics, [key]: Number(event.target.value) };
                        setPhysics(next);
                        instrument.current?.physics(next);
                      }}
                    />
                    <div className="lab-range-labels t-micro">
                      <span>{c.physics[key].low}</span>
                      <span>{c.physics[key].high}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          className="lab-action"
          type="button"
          disabled={!available}
          onClick={() => {
            if (kind === "breaker" && game.status === "running") setPlaying(paused);
            else if (kind === "orbit") selectForm((form + 1) % c.forms.length);
            else action();
          }}
        >
          {actionLabel}
          <span aria-hidden="true">↗</span>
        </button>
        <div className="lab-hint">
          <span className="t-micro">↳ {c.controls}</span>
          <p>
            {kind === "lock" ? c.gameHint : kind === "breaker" ? c.breakerHint : experiment.hint}
          </p>
          <p className="lab-keyboard-note">{keyboard}</p>
          {reduced && paused && <p>{c.reduced}</p>}
        </div>
      </aside>
    </section>
  );
}

export default function Lab() {
  const { locale } = useLocale();
  const c = LAB_COPY[locale];
  const [selected, setSelected] = useState(0);
  return (
    <div className="lab-page wrap">
      <header className="lab-header">
        <div>
          <p className="lab-eyebrow t-micro">
            <span />
            {c.eyebrow}
          </p>
          <h1 aria-label={`${c.title[0]} ${c.title[1]}`}>
            {c.title[0]}
            <br />
            <em>{c.title[1]}</em>
            <span className="lab-title-star" aria-hidden="true">
              ✳
            </span>
          </h1>
        </div>
        <div className="lab-intro">
          <p>{c.intro}</p>
          <span className="t-label">
            {c.invitation} <span aria-hidden="true">↙</span>
          </span>
        </div>
      </header>
      <div className="lab-collection-label t-micro">
        <span>{c.collection}</span>
        <span>01—06</span>
      </div>
      <div className="lab-selector" role="group" aria-label={c.collection}>
        {c.experiments.map((experiment, i) => (
          <button
            key={experiment.id}
            className={`lab-choice${selected === i ? " is-selected" : ""}`}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span className="lab-choice-index t-micro">0{i + 1}</span>
            <Preview kind={experiment.id} />
            <span className="lab-choice-name">
              {experiment.name}
              <span className="t-micro">{experiment.category.split(" / ")[1]}</span>
            </span>
            <span className="lab-choice-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <Workbench key={selected} index={selected} />
      <footer className="lab-footer">
        <p className="t-micro">{c.footer}</p>
        <button type="button" onClick={() => setSelected((selected + 1) % c.experiments.length)}>
          {c.next} <span aria-hidden="true">→</span>
        </button>
        <RouteLink to="home">{c.back} ↗</RouteLink>
      </footer>
    </div>
  );
}
