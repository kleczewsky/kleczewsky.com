import { createContext, useContext, type ReactNode } from "react";
import { Link, useLocation, type LinkProps } from "react-router";
import { DEFAULT_LOCALE, href, match, type Locale } from "../routes";
import { DICTS, type Dict } from "../i18n";

/* Locale is derived from the URL, never from state: it's the only
   thing that survives a share, a crawl or a cold load. The stored
   preference below only ever influences a redirect. */

interface LocaleValue {
  locale: Locale;
  t: Dict;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function localeFromPath(pathname: string): Locale {
  return match(pathname)?.locale ?? (pathname.startsWith("/pl") ? "pl" : DEFAULT_LOCALE);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  return (
    <LocaleContext.Provider value={{ locale, t: DICTS[locale] }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

/** Resolves a route id in the current locale, so no call site ever
 * hand-writes a path and Polish links cannot drift. */
export function RouteLink({ to, children, ...rest }: { to: string } & Omit<LinkProps, "to">) {
  const { locale } = useLocale();
  return (
    <Link to={href(to, locale)} {...rest}>
      {children}
    </Link>
  );
}

export const STORAGE_KEY = "kleczewsky:locale";

/** Remember an explicit choice. Only ever set by the visitor. */
export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* private mode — the URL still carries the choice for this visit */
  }
}
