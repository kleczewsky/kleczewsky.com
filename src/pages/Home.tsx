import { useState } from "react";
import { RouteLink, useLocale } from "../lib/locale";
import { WORK } from "../content/work";
import { EMAIL, PROFILES } from "../content/links";
import { Diagram, SkylineMark, type DiagramKind } from "../components/Diagrams";
import "./Home.css";

/* Below the hero: a centred head with a lit title, a card leading
   with a diagram, one chamfered slab, and a definition grid. */

const SERVICE_ART: DiagramKind[] = ["backend", "frontend", "takeover"];

function Head({
  mark,
  title,
  lead,
  marked,
}: {
  mark: string;
  title: string;
  lead: string;
  marked?: boolean;
}) {
  return (
    <header className="head">
      <span className="head-rule" aria-hidden="true" />
      <p className="t-label t-primary">{mark}</p>
      <h2 className={`t-display head-title${marked ? " head-title--marked" : ""}`}>{title}</h2>
      <p className="t-body head-lead">{lead}</p>
    </header>
  );
}

/** One project at a time on a chamfered plate. Three products do not
    need three cards; they need one object that can hold any of them
    properly. */
function WorkSlab({ i, setI }: { i: number; setI: (n: number) => void }) {
  const { t, locale } = useLocale();
  const study = WORK[i];
  if (!study) return null;

  const step = (d: number) => setI((i + d + WORK.length) % WORK.length);

  return (
    <div className="slab">
      <div className="slab-mark" aria-hidden="true">
        <SkylineMark seed={i + 1} />
      </div>

      <div className="slab-inner">
        <div className="slab-top">
          <div className="slab-tabs" role="group" aria-label={t.nav.work}>
            {WORK.map((w, n) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={n === i}
                aria-label={w.name}
                className="pill slab-tab t-micro"
                onClick={() => setI(n)}
              >
                {w.index}
              </button>
            ))}
          </div>
          <span className="slab-lead-line" aria-hidden="true" />
          <span className="t-micro t-faint">{t.chapter.work}</span>
        </div>

        <h3 className="t-display slab-title">{study.name}</h3>
        <p className="t-lead slab-text">{study.summary[locale]}</p>

        <div className="meta-row">
          {study.status ? (
            <span className={`pill t-micro work-status--${study.status}`}>
              {study.status === "live" ? t.work.live : t.work.offline}
            </span>
          ) : null}
        </div>

        <div className="slab-foot">
          {study.mark ? (
            <div className="slab-stamp-zone" aria-hidden="true">
              <span
                className="slab-stamp"
                style={{ "--stamp": `url(${study.mark})` } as React.CSSProperties}
              />
            </div>
          ) : null}

          {study.links?.map((link, n) => (
            <a
              key={link.url}
              href={link.url}
              rel="noreferrer"
              target="_blank"
              className={`btn${n === 0 ? " btn-glow" : ""}`}
            >
              {link.label} ↗
            </a>
          ))}
          <div className="slab-nav">
            <button type="button" onClick={() => step(-1)} aria-label={t.work.previous}>
              ‹
            </button>
            <button type="button" onClick={() => step(1)} aria-label={t.work.next}>
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The about section is a dossier: a spec plate that stays put, a
    tagged log beside it, and three figures the prose only mentions. */
function AboutPlate() {
  const { t } = useLocale();

  return (
    <aside className="about-plate">
      <div className="about-plate-top">
        <span className="t-micro t-primary">{t.about.dossier}</span>
        <span className="leader-fill" aria-hidden="true" />
        <span className="t-micro t-faint">EK / 01</span>
      </div>

      <div className="about-plate-id">
        <p className="t-display about-plate-name">Eryk Kleczewski</p>
        <p className="t-label t-dim">{t.meta.tagline}</p>
      </div>

      <dl className="about-specs">
        <div className="leader">
          <dt className="t-micro t-faint">{t.about.baseLabel}</dt>
          <span className="leader-fill" aria-hidden="true" />
          <dd className="t-micro leader-value">{t.status.location}</dd>
        </div>
        <div className="leader">
          <dt className="t-micro t-faint">{t.about.statusLabel}</dt>
          <span className="leader-fill" aria-hidden="true" />
          <dd className="t-micro leader-value about-live">
            <span className="chip-dot" />
            {t.status.available}
          </dd>
        </div>
      </dl>

      <div className="about-plate-stack">
        <p className="t-micro t-faint">{t.about.stackLabel}</p>
        <p className="t-small about-stack">{t.home.stack}</p>
      </div>

      <a href="#contact" className="btn btn-glow about-plate-cta">
        {t.home.toContact}
      </a>
    </aside>
  );
}

function AboutSection() {
  const { t } = useLocale();

  return (
    <div className="about-field">
      <section className="section wrap" id="about">
        <Head mark="01" title={t.nav.about} lead={t.about.lead} />

        <div className="about">
          <AboutPlate />

          <div className="about-column">
            <ol className="about-log" role="list">
              {t.about.body.map((entry) => (
                <li key={entry.mark}>
                  <p className="t-micro about-log-mark">{entry.mark}</p>
                  <p className="t-body about-log-text">{entry.text}</p>
                </li>
              ))}
            </ol>

            <ul className="about-figures" role="list">
              {t.about.figures.map((figure) => (
                <li key={figure.label} className="about-figure">
                  <span className="t-micro t-primary">{figure.kicker}</span>
                  <span className="t-display about-figure-value">{figure.value}</span>
                  <span className="t-small t-faint about-figure-label">{figure.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/*<div className="about-now">*/}
        {/*  <h3 className="t-micro about-now-mark">*/}
        {/*    <span className="chip-dot" />*/}
        {/*    {t.about.nowHeading}*/}
        {/*  </h3>*/}
        {/*  <p className="t-lead about-now-text">{t.about.now}</p>*/}
        {/*</div>*/}
      </section>
    </div>
  );
}

export default function Home() {
  const { t } = useLocale();
  const [i, setI] = useState(0);

  return (
    <>
      <section className="home-hero">
        <div className="home-crest">
          {/* buildWordmark() in Scene.tsx measures this node to redraw
              it in 3D: accent is the trailing span, split point is
              the text length before it. Check it before editing. */}
          <h1 className="t-hero home-name" data-wordmark>
            Kleczew<span>sky</span>
          </h1>
        </div>

        <div className="home-bar">
          <div className="wrap home-bar-inner">
            <div className="home-say">
              <p className="chip chip--live t-micro home-status">
                <span className="chip-dot" />
                {t.status.availableLong}
              </p>
              <p className="t-body home-intro">{t.home.intro}</p>
              <p className="t-label t-dim home-stack">{t.home.stack}</p>
            </div>
            <div className="home-cta">
              <a href="#contact" className="btn btn-glow">
                {t.home.toContact}
              </a>
              <a href="#work" className="btn">
                {t.home.toWork}
              </a>
            </div>
          </div>
        </div>

        <p className="t-micro t-faint home-scroll" aria-hidden="true">
          ↓ {t.home.scroll}
        </p>
      </section>

      <AboutSection />

      {/* Freelance readers stop at the first section they can act on,
          so the offer goes above the proof. */}
      <section className="section wrap" id="services">
        <Head mark="02" title={t.hire.mark} lead={t.hire.lead} marked />
        <ul className="home-cards" role="list">
          {t.hire.items.map((item, n) => (
            <li key={item.title} className="card">
              <div className="card-well">
                <Diagram kind={SERVICE_ART[n] ?? "backend"} />
              </div>
              <div className="card-body">
                <h3 className="t-title">{item.title}</h3>
                <p className="t-small card-text">{item.body}</p>
              </div>
              <div className="meta-row">
                <span className="pill t-micro">{t.hire.kind}</span>
                <span className="pill t-micro">{n + 1}</span>
                <span className="pill t-micro meta-push">{item.tags[0]}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section wrap" id="work">
        <Head mark="03" title={t.nav.work} lead={t.work.lead} />
        <WorkSlab i={i} setI={setI} />
      </section>

      {/* Facts, listed rather than sold. This is the section a tech
          lead scans for the stack, so it is a table and not a pitch. */}
      <section className="section wrap" id="stack">
        <Head mark="04" title={t.stack.mark} lead={t.stack.lead} />
        <dl className="defs">
          {t.stack.items.map((item) => (
            <div key={item.term}>
              <dt className="t-title def-term">{item.term}</dt>
              <dd className="t-small def-desc">{item.desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section wrap" id="lab">
        <Head mark="05" title={t.nav.lab} lead={t.lab.lead} />
        <div className="home-centre">
          <RouteLink to="lab" className="btn">
            {t.home.more} →
          </RouteLink>
        </div>
      </section>

      <section className="section wrap" id="contact">
        <Head mark="06" title={t.nav.contact} lead={t.contact.lead} marked />
        <div className="home-centre home-contact">
          <a className="t-display contact-email" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
          {PROFILES.length > 0 ? (
            <div className="contact-profiles t-body">
              {PROFILES.map((profile) => (
                <a key={profile.url} href={profile.url} rel="me noreferrer">
                  {profile.label}
                </a>
              ))}
            </div>
          ) : null}
          <p className="t-micro t-faint">{t.contact.responseNote}</p>
        </div>
      </section>
    </>
  );
}
