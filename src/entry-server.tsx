import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import App from "./App";
import { DICTS } from "./i18n";
import { LOCALES, href, match, type Locale } from "./routes";

/* MemoryRouter renders the same tree the browser hydrates, without a
   static-router API that moves between React Router majors. */

export const SITE = "https://kleczewsky.com";

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

/** hreflang is what gets both language versions indexed — GitHub
 * Pages cannot redirect crawlers by Accept-Language. */
export function head(url: string): string {
  const found = match(url);
  const locale: Locale = found?.locale ?? "en";
  const dict = DICTS[locale];
  const routeId = found?.route.id ?? "home";

  const chapterKey = routeId as keyof typeof dict.chapter;
  let title = `${dict.chapter[chapterKey]} · ${dict.meta.siteName}`;
  const description = dict.meta.description;
  const alternateFor = (code: Locale) => `${SITE}${href(routeId, code)}`;

  if (routeId === "home") {
    title = `${dict.meta.siteName} · ${dict.meta.tagline}`;
  }

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
    `<meta name="twitter:card" content="summary_large_image" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export { LOCALES, ROUTES, href, allUrls } from "./routes";
