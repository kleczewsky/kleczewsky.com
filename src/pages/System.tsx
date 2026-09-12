import { useLocale } from "../lib/locale";
import { useEffect, useState } from "react";
import "./System.css";

/* Every swatch paints itself with var(--token) and reads the resolved
   value back out of the document, so it cannot drift from tokens.css. */

function useResolved(names: string[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const name of names) next[name] = style.getPropertyValue(name).trim();
    setValues(next);
    // names is a literal array per call site and never changes identity
    // in a way that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return values;
}

function Swatch({ token, role, resolved }: { token: string; role: string; resolved: string }) {
  const { t } = useLocale();
  return (
    <div className="sw">
      <div className="sw-chip" style={{ background: `var(${token})` }} />
      <div className="sw-meta">
        <span className="t-micro sw-token">{token}</span>
        <span className="t-micro t-faint">{resolved || t.system.unavailable}</span>
        <span className="t-small t-dim sw-role">{role}</span>
      </div>
    </div>
  );
}

function Group({
  title,
  note,
  tokens,
}: {
  title: string;
  note?: string;
  tokens: [string, string][];
}) {
  const resolved = useResolved(tokens.map(([t]) => t));
  return (
    <div className="sys-group">
      <h3 className="t-label t-dim">{title}</h3>
      {note ? <p className="t-small t-faint sys-note">{note}</p> : null}
      <div className="sw-grid">
        {tokens.map(([token, role]) => (
          <Swatch key={token} token={token} role={role} resolved={resolved[token] ?? ""} />
        ))}
      </div>
    </div>
  );
}

function Section({
  mark,
  title,
  children,
}: {
  mark: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sys-section">
      <header className="sys-head">
        <span className="t-label t-primary">{mark}</span>
        <h2 className="t-title">{title}</h2>
      </header>
      {children}
    </section>
  );
}

const SPACE = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8", "--s9"];

export default function System() {
  const { t } = useLocale();
  const TYPE_SPECIMENS: { cls: string; label: string; sample: string; spec: string }[] = [
    {
      cls: "t-hero",
      label: "t-hero",
      sample: "Kleczewsky",
      spec: "Teko 600 · clamp 3.5–8.5rem · lh .80 · −.03em",
    },
    {
      cls: "t-display",
      label: "t-display",
      sample: t.hire.mark,
      spec: "Teko 600 · clamp 2.75–4.5rem · lh .82 · −.03em",
    },
    {
      cls: "t-title",
      label: "t-title",
      sample: t.hire.items[0]?.title ?? t.hire.mark,
      spec: "Spline Sans 600 · clamp 1.5–2rem · lh 1.05",
    },
    {
      cls: "t-lead",
      label: "t-lead",
      sample: t.home.stack,
      spec: "Spline Sans 400 · clamp 1.06–1.25rem · ink-dim",
    },
    {
      cls: "t-body",
      label: "t-body",
      sample: t.system.bodySample,
      spec: "Spline Sans 400 · 1rem · lh 1.6",
    },
    {
      cls: "t-small",
      label: "t-small",
      sample: t.system.smallSample,
      spec: "Spline Sans 400 · .875rem",
    },
    {
      cls: "t-label",
      label: "t-label",
      sample: `03 / ${t.nav.work}`,
      spec: "JetBrains Mono 500 · 11px · tracking .14em",
    },
    {
      cls: "t-micro",
      label: "t-micro",
      sample: `${t.hud.status} ${t.status.available} · ${t.hud.localTime} 19:40`,
      spec: "JetBrains Mono 400 · 10px · tabular · tracking .2em",
    },
  ];
  const MOTION: [string, string][] = [
    ["--d-instant", t.system.motionInstant],
    ["--d-fast", t.system.motionFast],
    ["--d-base", t.system.motionBase],
    ["--d-slow", t.system.motionSlow],
    ["--d-cine", t.system.motionCine],
  ];
  const space = useResolved(SPACE);
  const motion = useResolved(MOTION.map(([t]) => t));

  return (
    <div className="section wrap sys">
      <p className="t-label t-primary section-mark">{t.chapter.system}</p>
      <h1 className="t-display">{t.system.title}</h1>
      <p className="t-lead sys-intro">{t.system.intro}</p>

      <Section mark="01" title={t.system.ground}>
        <Group
          title={t.system.surfaces}
          note={t.system.surfacesNote}
          tokens={[
            ["--ground", t.system.pageGround],
            ["--panel-sunk", t.system.deepestPanel],
            ["--panel", t.system.panel],
            ["--panel-raised", t.system.raisedPanel],
          ]}
        />
        <Group
          title={t.system.lines}
          tokens={[
            ["--rule", t.system.hairline],
            ["--rule-strong", t.system.strongLine],
            ["--rule-solid", t.system.solidEdge],
          ]}
        />
      </Section>

      <Section mark="02" title={t.system.text}>
        <Group
          title={t.system.ramp}
          note={t.system.textNote}
          tokens={[
            ["--ink", t.system.primary],
            ["--ink-dim", t.system.secondary],
            ["--ink-faint", t.system.tertiary],
          ]}
        />
      </Section>

      <Section mark="03" title={t.system.accent}>
        <Group
          title={t.system.oneAccent}
          note={t.system.accentNote}
          tokens={[
            ["--primary", t.system.rest],
            ["--primary-hot", t.system.hover],
            ["--primary-dark", t.system.pressed],
          ]}
        />
        <Group
          title={t.system.semantic}
          note={t.system.statusNote}
          tokens={[
            ["--ok", t.system.success],
            ["--warning", t.system.warning],
            ["--error", t.system.error],
          ]}
        />
      </Section>

      <Section mark="04" title={t.system.type}>
        <div className="sys-type">
          {TYPE_SPECIMENS.map((s) => (
            <div key={s.cls} className="sys-spec">
              <div className="sys-spec-meta">
                <span className="t-micro sw-token">{s.label}</span>
                <span className="t-micro t-faint">{s.spec}</span>
              </div>
              <div className={s.cls}>{s.sample}</div>
            </div>
          ))}
        </div>
        <div className="sys-group">
          <h3 className="t-label t-dim">{t.system.fonts}</h3>
          <p className="t-small t-faint sys-note">{t.system.fontsNote}</p>
          <div className="sys-width">
            <div>
              <span className="t-micro t-faint">{t.system.displayFont}</span>
              <div className="t-display">Kleczewsky</div>
            </div>
            <div>
              <span className="t-micro t-faint">{t.system.readingFont}</span>
              <div className="t-title">Kleczewsky</div>
            </div>
            <div>
              <span className="t-micro t-faint">{t.system.monoFont}</span>
              <div className="t-label">Kleczewsky</div>
            </div>
          </div>
        </div>
      </Section>

      <Section mark="05" title={t.system.space}>
        <div className="sys-space">
          {SPACE.map((token) => (
            <div key={token} className="sys-space-row">
              <span className="t-micro sw-token">{token}</span>
              <span className="t-micro t-faint">{space[token] ?? t.system.unavailable}</span>
              <span className="sys-space-bar" style={{ width: `var(${token})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section mark="06" title={t.system.motion}>
        <p className="t-small t-faint sys-note">{t.system.motionNote}</p>
        <div className="sys-motion">
          {MOTION.map(([token, use]) => (
            <div key={token} className="sys-motion-row">
              <span className="t-micro sw-token">{token}</span>
              <span className="t-micro t-faint">{motion[token] ?? t.system.unavailable}</span>
              <span className="t-small t-dim">{use}</span>
              <span className="sys-motion-track" style={{ ["--dur" as string]: `var(${token})` }}>
                <span className="sys-motion-dot" />
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section mark="07" title={t.system.components}>
        <div className="sys-group">
          <h3 className="t-label t-dim">{t.system.buttons}</h3>
          <p className="t-small t-faint sys-note">{t.system.buttonsNote}</p>
          <div className="sys-row">
            <button type="button" className="btn btn-primary t-label">
              {t.system.primaryAction}
            </button>
            <button type="button" className="btn t-label">
              {t.system.secondaryAction}
            </button>
          </div>
        </div>

        <div className="sys-group">
          <h3 className="t-label t-dim">{t.system.readouts}</h3>
          <dl className="sys-row">
            <div className="readout t-micro">
              <dt>{t.hud.status}</dt>
              <dd>{t.status.available}</dd>
            </div>
            <div className="readout t-micro">
              <dt>{t.hud.localTime}</dt>
              <dd>19:40</dd>
            </div>
            <div className="readout t-micro">
              <dt>{t.hud.tier}</dt>
              <dd>A</dd>
            </div>
          </dl>
        </div>

        <div className="sys-group">
          <h3 className="t-label t-dim">{t.system.panelRule}</h3>
          <div className="panel sys-panel">
            <p className="t-label t-dim">{t.system.panel}</p>
            <hr className="rule" />
            <p className="t-small t-dim">{t.system.panelNote}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
