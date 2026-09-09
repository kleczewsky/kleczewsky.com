import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { applyTier } from "./lib/tier";

applyTier();

const container = document.getElementById("root");
if (!container) throw new Error("#root missing");

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Prerendered markup is present on a cold load; dev serves a shell whose
// only child is the <!--app-html--> placeholder. Test for an element
// child specifically — hasChildNodes() counts that comment and would
// send dev down the hydration path against empty markup.
if (container.firstElementChild) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
