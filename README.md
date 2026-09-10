# kleczewsky.com

Personal portfolio. Vite + React + TypeScript, prerendered to static
HTML, deployed to GitHub Pages.

## Direction

A night city seen from behind a curtain wall on a high floor. Three
decisions are load-bearing and documented in `src/styles/tokens.css`:

- **The night is blue.** Sodium amber in the windows is the only warm
  thing on screen.
- **One accent.** `--primary`. Semantic colours are a separate axis and
  never stand in for it.
- **Red is the interface.** Obstruction lights, the frame, the
  wordmark's accent. Nowhere else in the world.

## Commands

```
npm run dev         # dev server
npm run build       # client + server bundles, then prerender
npm run preview     # serve the built site
npm run typecheck   # tsc --noEmit
```

## Layout

```
src/three/      the hero scene (R3F). knobs.ts holds every tuned value.
src/components/ chrome: frame, top and bottom bars, scrollbar.
src/pages/      one file per route. /system is the living token reference.
src/styles/     tokens, base, shared components.
src/i18n/       en + pl. pl.ts is typed against en.ts
```

## Scene

The scene is lazy-loaded and tier-gated: a device probe sets
`data-tier` on `<html>`, and tier C never downloads three.js at all. In
dev, a panel (backtick to toggle) exposes the sky, post and wordmark
knobs; `copy` puts the current state on the clipboard ready to paste
back into `src/three/knobs.ts`, which is where the defaults live.
