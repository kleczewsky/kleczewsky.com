import { useRef, useState } from "react";
import { RouteLink, useLocale } from "../lib/locale";
import { agentBrief, emailDraft, ENGAGEMENTS, type Engagement } from "../content/agents";
import { CONNECT_COPY } from "../content/connect-copy";
import "./Connect.css";

const FILES = ["/profile.json", "/agents.md", "/llms.txt"];

function PlateLabel({ label, index }: { label: string; index: string }) {
  return (
    <div className="connect-plate-label">
      <p className="t-micro t-primary">{label}</p>
      <span className="leader-fill" aria-hidden="true" />
      <span className="t-micro t-faint" aria-hidden="true">
        {index}
      </span>
    </div>
  );
}

export default function Connect() {
  const { locale } = useLocale();
  const c = CONNECT_COPY[locale];
  const [kind, setKind] = useState<Engagement>("contract");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const brief = useRef<HTMLTextAreaElement>(null);
  const text = agentBrief(kind);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      brief.current?.focus();
      brief.current?.select();
    }
  }

  return (
    <div className="section wrap connect">
      <header className="connect-intro">
        <p className="t-label t-primary">{c.label} / 07</p>
        <h1 className="t-display connect-title">
          {c.title}
          <br />
          <span>{c.accent}</span>
        </h1>
        <p className="t-lead connect-lead">{c.lead}</p>
        <ul className="connect-status" role="list">
          <li>
            <span className="chip-dot" />
            {c.access}
          </li>
          <li>{c.format}</li>
          <li>{c.permission}</li>
        </ul>
      </header>

      <div className="connect-grid">
        <section className="connect-panel" aria-labelledby="human-title">
          <PlateLabel label={c.human} index="01" />
          <h2 id="human-title" className="t-title">
            {c.humanTitle}
          </h2>
          <p className="t-body t-dim">{c.humanLead}</p>
          <fieldset className="connect-kinds">
            <legend className="t-label t-faint">{c.kindLabel}</legend>
            {ENGAGEMENTS.map((value) => (
              <label key={value} className="connect-kind t-small">
                <input
                  type="radio"
                  name="engagement"
                  value={value}
                  checked={kind === value}
                  onChange={() => {
                    setKind(value);
                    setCopyState("idle");
                  }}
                />
                <span>{c.kinds[value]}</span>
              </label>
            ))}
          </fieldset>
          <a className="btn btn-glow connect-draft" href={emailDraft(kind, locale === "pl")}>
            {c.draft} ↗
          </a>
          <p className="t-small t-faint">{c.emailNote}</p>
        </section>

        <section className="connect-panel" aria-labelledby="agent-title">
          <PlateLabel label={c.agent} index="02" />
          <h2 id="agent-title" className="t-title">
            {c.agentTitle}
          </h2>
          <p className="t-body t-dim">{c.agentLead}</p>
          <ul className="connect-files" role="list">
            {FILES.map((file, i) => (
              <li key={file}>
                <a href={file}>
                  <span className="connect-file-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 28" fill="none">
                      <path d="M3 1h12l6 6v20H3zM15 1v7h6M7 14h10M7 19h7" />
                    </svg>
                  </span>
                  <span className="connect-file-copy">
                    <span className="connect-file-path">{file}</span>
                    <span className="t-small connect-file-description">{c.resources[i]}</span>
                  </span>
                  <span className="connect-file-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="connect-brief" aria-labelledby="brief-title">
        <div className="connect-brief-head">
          <PlateLabel label={c.promptLabel} index="03" />
          <h2 className="t-title" id="brief-title">
            {c.promptTitle}
          </h2>
          <p className="t-body t-dim">{c.promptLead}</p>
          <button className="btn" type="button" onClick={() => void copy()}>
            {copyState === "copied" ? c.copied : c.copy} {copyState === "copied" ? "✓" : "↗"}
          </button>
          <p className="t-small t-faint" role="status">
            {copyState === "failed" ? c.copyFailed : copyState === "copied" ? c.copied : ""}
          </p>
        </div>
        <div className="connect-terminal">
          <label className="t-micro t-faint" htmlFor="agent-brief">
            {c.briefLabel}
          </label>
          <textarea
            id="agent-brief"
            ref={brief}
            value={text}
            readOnly
            spellCheck={false}
            lang="en"
          />
        </div>
      </section>
      <RouteLink to="home" className="t-small t-dim connect-back">
        ← {c.back}
      </RouteLink>
    </div>
  );
}
