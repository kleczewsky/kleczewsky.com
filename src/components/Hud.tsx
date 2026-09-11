import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { LOCALES, NAV_ITEMS, href, match, type Locale } from "../routes";
import { RouteLink, rememberLocale, useLocale } from "../lib/locale";
import { forceTierA, useTier } from "../lib/tier";
import "./Hud.css";

/* The bottom strip only ever shows values that are actually true:
   Eryk's actual local time, his actual availability, the tier the
   probe actually settled on. */

function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Warsaw",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function LanguageSwitch() {
  const { locale, t } = useLocale();
  const { pathname } = useLocation();
  const current = match(pathname);

  return (
    <div className="hud-lang t-label" role="group" aria-label={t.nav.languageLabel}>
      {LOCALES.map((code: Locale) => {
        const target = current ? href(current.route.id, code) : href("home", code);
        const isCurrent = code === locale;
        return (
          <a
            key={code}
            href={target}
            hrefLang={code}
            aria-current={isCurrent ? "true" : undefined}
            className={isCurrent ? "is-current" : undefined}
            onClick={() => rememberLocale(code)}
          >
            {code}
          </a>
        );
      })}
    </div>
  );
}

export default function Hud() {
  const { t, locale } = useLocale();
  const time = useClock();
  const probed = useTier();
  const tier = probed ?? "c";
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Any navigation closes the sheet, including back/forward.
  // oxlint-disable-next-line react/set-state-in-effect, react/exhaustive-effect-dependencies
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="hud-top">
        <RouteLink to="home" className="hud-plate hud-mark t-label">
          {/* The same file <link rel="icon"> points at, so the mark has
              one definition. */}
          <img className="hud-mark-k" src="/favicon.svg" width="32" height="32" alt="" />
          {/* One flex item, or .hud-plate's gap lands between the
              syllables and breaks the word. */}
          <span>
            kleczew<span className="hud-mark-sky">sky</span>
            <span className="hud-mark-tld">.com</span>
          </span>
        </RouteLink>

        <nav className="hud-nav t-label" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={item.href(locale)}>
              <span>{t.nav[item.id as keyof typeof t.nav]}</span>
            </a>
          ))}
        </nav>

        <LanguageSwitch />

        <a href={`${href("home", locale)}#contact`} className="hud-go t-label">
          {t.home.toContact}
        </a>

        <button
          type="button"
          className="hud-menu t-label"
          aria-expanded={open}
          aria-controls="hud-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      <nav
        id="hud-sheet"
        className={`hud-sheet${open ? " is-open" : ""}`}
        aria-label="Primary"
        aria-hidden={!open}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href(locale)}
            className="t-display"
            onClick={() => setOpen(false)}
          >
            {t.nav[item.id as keyof typeof t.nav]}
          </a>
        ))}
      </nav>

      <div className="hud-bottom t-micro" aria-hidden="true">
        <span className="hud-beacon" />
        <span>
          {t.hud.status} <b className="hud-ok">{t.status.available}</b>
        </span>
        <span className="hud-loc">{t.status.location}</span>
        <span>
          {t.hud.localTime} <b>{time ?? "--:--"}</b>
        </span>
        <span className="hud-tier">
          {t.hud.tier} <b>{tier.toUpperCase()}</b>
          {probed && probed !== "a" ? (
            <button type="button" className="hud-override" onClick={forceTierA}>
              ({t.hud.override})
            </button>
          ) : null}
        </span>
      </div>
    </>
  );
}
