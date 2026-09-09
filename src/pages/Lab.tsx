import { useLocale } from "../lib/locale";

export default function Lab() {
  const { t } = useLocale();
  return (
    <section className="section wrap">
      <p className="t-label t-primary section-mark">{t.chapter.lab}</p>
      <h1 className="t-display">{t.nav.lab}</h1>
      <p className="t-lead prose-lead">{t.lab.lead}</p>
      <p className="t-micro t-faint" style={{ marginTop: "var(--s6)" }}>
        {t.lab.pending}
      </p>
    </section>
  );
}
