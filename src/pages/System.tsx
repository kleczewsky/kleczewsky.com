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
  return (
    <div className="sw">
      <div className="sw-chip" style={{ background: `var(${token})` }} />
      <div className="sw-meta">
        <span className="t-micro sw-token">{token}</span>
        <span className="t-micro t-faint">{resolved || "n/a"}</span>
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
    sample: "Hire me for",
    spec: "Teko 600 · clamp 2.75–4.5rem · lh .82 · −.03em",
  },
  {
    cls: "t-title",
    label: "t-title",
    sample: "Production Laravel systems",
    spec: "Spline Sans 600 · clamp 1.5–2rem · lh 1.05",
  },
  {
    cls: "t-lead",
    label: "t-lead",
    sample: "Production Laravel and React, shipped and running.",
    spec: "Spline Sans 400 · clamp 1.06–1.25rem · ink-dim",
  },
  {
    cls: "t-body",
    label: "t-body",
    sample: "Body copy sits at one rem with a 1.6 line height and a 64ch measure.",
    spec: "Spline Sans 400 · 1rem · lh 1.6",
  },
  {
    cls: "t-small",
    label: "t-small",
    sample: "Secondary detail and captions.",
    spec: "Spline Sans 400 · .875rem",
  },
  {
    cls: "t-label",
    label: "t-label",
    sample: "02 / Work",
    spec: "JetBrains Mono 500 · 11px · tracking .14em",
  },
  {
    cls: "t-micro",
    label: "t-micro",
    sample: "Status AVAILABLE · Local 19:40",
    spec: "JetBrains Mono 400 · 10px · tabular · tracking .2em",
  },
];

const SPACE = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8", "--s9"];

const MOTION: [string, string][] = [
  ["--d-instant", "state acknowledgement"],
  ["--d-fast", "hover, focus"],
  ["--d-base", "panels, disclosure"],
  ["--d-slow", "section entrances"],
  ["--d-cine", "the intro sequence"],
];

export default function System() {
  const space = useResolved(SPACE);
  const motion = useResolved(MOTION.map(([t]) => t));

  return (
    <div className="section wrap sys">
      <p className="t-label t-primary section-mark">System</p>
      <h1 className="t-display">Design system</h1>
      <p className="t-lead sys-intro">
        Live reference for the design system. Values are read back out of the running document, so
        this page always shows what the site actually uses.
      </p>

      <Section mark="01" title="Ground">
        <Group
          title="Surfaces"
          note="Near-black with a faint green cast. The accent is red, and that complementary tension is what stops the page reading as a generic dark theme."
          tokens={[
            ["--ground", "page ground"],
            ["--panel-sunk", "deepest panel"],
            ["--panel", "panel"],
            ["--panel-raised", "raised panel"],
          ]}
        />
        <Group
          title="Lines"
          tokens={[
            ["--rule", "hairline"],
            ["--rule-strong", "emphasised hairline"],
            ["--rule-solid", "solid edge"],
          ]}
        />
      </Section>

      <Section mark="02" title="Text">
        <Group
          title="Ramp"
          note="Secondary text is a desaturated green-grey so dimmed copy reads as depth, not as grey UI chrome."
          tokens={[
            ["--ink", "primary"],
            ["--ink-dim", "secondary"],
            ["--ink-faint", "tertiary, labels"],
          ]}
        />
      </Section>

      <Section mark="03" title="Accent">
        <Group
          title="The one accent"
          note="Interactive affordances, live values, section eyebrows. Never decoration, never large fills, never body text."
          tokens={[
            ["--primary", "rest"],
            ["--primary-hot", "hover"],
            ["--primary-dark", "pressed"],
          ]}
        />
        <Group
          title="Semantic: a separate axis"
          note="Status colours. These never stand in for the accent: --ok marks a product that is live, and that is the only claim it is allowed to make."
          tokens={[
            ["--ok", "live, success"],
            ["--warning", "warning"],
            ["--error", "error"],
          ]}
        />
      </Section>

      <Section mark="04" title="Type">
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
          <h3 className="t-label t-dim">Width axis</h3>
          <p className="t-small t-faint sys-note">
            One family covers both cuts. Display is condensed, reading is normal.
          </p>
          <div className="sys-width">
            <div>
              <span className="t-micro t-faint">wdth 78, display</span>
              <div className="t-display">Kleczewsky</div>
            </div>
            <div>
              <span className="t-micro t-faint">wdth 100, reading</span>
              <div className="t-title">Kleczewsky</div>
            </div>
          </div>
        </div>
      </Section>

      <Section mark="05" title="Space">
        <div className="sys-space">
          {SPACE.map((token) => (
            <div key={token} className="sys-space-row">
              <span className="t-micro sw-token">{token}</span>
              <span className="t-micro t-faint">{space[token] ?? "n/a"}</span>
              <span className="sys-space-bar" style={{ width: `var(${token})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section mark="06" title="Motion">
        <p className="t-small t-faint sys-note">
          Instruments move mechanically: fast to leave, long to settle. Hover a row to run its
          duration on the house curve.
        </p>
        <div className="sys-motion">
          {MOTION.map(([token, use]) => (
            <div key={token} className="sys-motion-row">
              <span className="t-micro sw-token">{token}</span>
              <span className="t-micro t-faint">{motion[token] ?? "n/a"}</span>
              <span className="t-small t-dim">{use}</span>
              <span className="sys-motion-track" style={{ ["--dur" as string]: `var(${token})` }}>
                <span className="sys-motion-dot" />
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section mark="07" title="Components">
        <div className="sys-group">
          <h3 className="t-label t-dim">Buttons</h3>
          <p className="t-small t-faint sys-note">
            One filled button per screen: it is the single conversion action. Everything else is a
            hairline.
          </p>
          <div className="sys-row">
            <button type="button" className="btn btn-primary t-label">
              Primary action
            </button>
            <button type="button" className="btn t-label">
              Secondary
            </button>
          </div>
        </div>

        <div className="sys-group">
          <h3 className="t-label t-dim">Readouts</h3>
          <dl className="sys-row">
            <div className="readout t-micro">
              <dt>Status</dt>
              <dd>Available</dd>
            </div>
            <div className="readout t-micro">
              <dt>Local</dt>
              <dd>19:40</dd>
            </div>
            <div className="readout t-micro">
              <dt>Tier</dt>
              <dd>A</dd>
            </div>
          </dl>
        </div>

        <div className="sys-group">
          <h3 className="t-label t-dim">Panel and rule</h3>
          <div className="panel sys-panel">
            <p className="t-label t-dim">Panel</p>
            <hr className="rule" />
            <p className="t-small t-dim">
              Translucent, so the scene continues behind it. Corner ticks rather than a radius: this
              reads as a registered panel, not a card.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
