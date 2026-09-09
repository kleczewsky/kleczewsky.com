/* Route manifest: paths, nav order, sitemap and prerender list all
   derive from it, so adding a page here adds it everywhere. */

export const LOCALES = ["en", "pl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export interface RouteDef {
  /** Stable key used in code and for the i18n page dictionaries. */
  id: string;
  /** Slug per locale, without the /pl prefix. */
  path: Record<Locale, string>;
}

export const ROUTES: RouteDef[] = [
  { id: "home", path: { en: "/", pl: "/" } },
  { id: "lab", path: { en: "/lab", pl: "/lab" } },
  { id: "system", path: { en: "/system", pl: "/system" } },
];

/** Full URL path for a route in a given locale. */
export function href(id: string, locale: Locale): string {
  const route = ROUTES.find((r) => r.id === id);
  if (!route) throw new Error(`Unknown route id: ${id}`);
  const slug = route.path[locale];
  if (locale === DEFAULT_LOCALE) return slug;
  return slug === "/" ? "/pl" : `/pl${slug}`;
}

const normalise = (p: string) => p.replace(/\/+$/, "") || "/";

/** Anchors on the home page rather than routes of their own — about,
 * work and contact live in Home's sections. Lab is a real route. */
export interface NavItem {
  id: string;
  href: (locale: Locale) => string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "about", href: (locale) => `${href("home", locale)}#about` },
  { id: "work", href: (locale) => `${href("home", locale)}#work` },
  { id: "lab", href: (locale) => href("lab", locale) },
  { id: "contact", href: (locale) => `${href("home", locale)}#contact` },
];

/** Resolve a pathname back to its route and locale. */
export function match(pathname: string): { route: RouteDef; locale: Locale } | null {
  const clean = normalise(pathname);

  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      if (normalise(href(route.id, locale)) === clean) return { route, locale };
    }
  }

  return null;
}

/** Every URL the prerenderer needs to emit. */
export function allUrls(): { url: string; id: string; locale: Locale }[] {
  return ROUTES.flatMap((route) =>
    LOCALES.map((locale) => ({ url: href(route.id, locale), id: route.id, locale })),
  );
}
