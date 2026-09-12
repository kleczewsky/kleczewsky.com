import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import App from "./App";
import { DICTS } from "./i18n";
import { LOCALES, href, match, type Locale } from "./routes";
import { CONNECT_COPY } from "./content/connect-copy";
export { machineFiles } from "./content/agents";

/* MemoryRouter renders the same tree the browser hydrates, without a
   static-router API that moves between React Router majors. */

export const SITE = "https://kleczewsky.com";

const OG_IMAGE = "/og.png";

const OG_LOCALE: Record<Locale, string> = { en: "en_GB", pl: "pl_PL" };

export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  );
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** hreflang is what gets both language versions indexed. GitHub
 * Pages cannot redirect crawlers by Accept-Language. */
export function head(url: string): string {
  const found = match(url);
  const locale: Locale = found?.locale ?? "en";
  const dict = DICTS[locale];
  const routeId = found?.route.id ?? "home";

  const chapterKey = routeId as keyof typeof dict.chapter;
  let title = `${dict.chapter[chapterKey]} · ${dict.meta.siteName}`;
  const description = routeId === "connect" ? CONNECT_COPY[locale].lead : dict.meta.description;
  const alternateFor = (code: Locale) => `${SITE}${href(routeId, code)}`;

  if (routeId === "home") {
    title = `${dict.meta.siteName} · ${dict.meta.tagline}`;
  }

  const ogAlt = `${dict.meta.siteName} · ${dict.meta.tagline}`;

  const alternates = LOCALES.map(
    (code) => `<link rel="alternate" hreflang="${code}" href="${alternateFor(code)}" />`,
  ).join("\n    ");

  return [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${SITE}${url}" />`,
    alternates,
    `<link rel="alternate" hreflang="x-default" href="${alternateFor("en")}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${SITE}${url}" />`,
    `<meta property="og:site_name" content="${escape(dict.meta.siteName)}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[locale]}" />`,
    `<meta property="og:image" content="${SITE}${OG_IMAGE}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escape(ogAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE}${OG_IMAGE}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export { LOCALES, ROUTES, href, allUrls } from "./routes";
