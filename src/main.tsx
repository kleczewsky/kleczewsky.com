import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { reach } from "./lib/boot";
import { applyTier } from "./lib/tier";

// Warms the chunk the moment the tier is known, rather than after
// hydration has run and Stage's effect has fired. Same module the
// lazy() in Stage resolves to, so it is one download either way, and
// tier C still never asks for it, so it has no boot screen to wait on.
if (applyTier() === "c") {
  delete document.documentElement.dataset.boot;
} else {
  reach("tier");
  void import("./three/Scene").then(() => reach("chunk"));
}

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
// child specifically: hasChildNodes() counts that comment and would
// send dev down the hydration path against empty markup.
if (container.firstElementChild) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
