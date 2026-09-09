import { RouteLink, useLocale } from "../lib/locale";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <section className="section wrap">
      <p className="t-label t-primary section-mark">{t.notFound.code}</p>
      <h1 className="t-display">{t.notFound.title}</h1>
      <p className="t-lead" style={{ marginTop: "var(--s5)" }}>
        {t.notFound.body}
      </p>
      <p style={{ marginTop: "var(--s6)" }}>
        <RouteLink to="home" className="btn btn-primary t-label">
          {t.notFound.home}
        </RouteLink>
      </p>
    </section>
  );
}
