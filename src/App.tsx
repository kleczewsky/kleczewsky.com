import { Route, Routes } from "react-router";
import { LOCALES, ROUTES, href } from "./routes";
import { LocaleProvider, useLocale } from "./lib/locale";
import Boot from "./components/Boot";
import Hud from "./components/Hud";
import Frame from "./components/Frame";
import ScrollRail from "./components/ScrollRail";
import Ripple from "./components/Ripple";
import Stage from "./three/Stage";
import Home from "./pages/Home";
import Lab from "./pages/Lab";
import System from "./pages/System";
import NotFound from "./pages/NotFound";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

const PAGES: Record<string, () => React.JSX.Element> = {
  home: Home,
  lab: Lab,
  system: System,
};

function Shell() {
  const { t } = useLocale();
  return (
    <>
      <a className="skip t-label" href="#main">
        {t.nav.skipToContent}
      </a>
      <Stage />
      <Ripple />
      <Frame />
      <ScrollRail />
      <Hud />
      <Boot />
      <main id="main">
        <Routes>
          {ROUTES.flatMap((route) =>
            LOCALES.map((locale) => {
              const Page = PAGES[route.id] ?? NotFound;
              return (
                <Route
                  key={`${route.id}:${locale}`}
                  path={href(route.id, locale)}
                  element={<Page />}
                />
              );
            }),
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <Shell />
    </LocaleProvider>
  );
}
