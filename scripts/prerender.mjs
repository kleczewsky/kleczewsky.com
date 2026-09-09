/*
  Prerender every route in every locale to a real directory + index.html.

  GitHub Pages serves /work/ from /work/index.html directly, so there
  is no SPA 404 fallback anywhere in this site — 404.html is an actual
  404 page. Hand-rolled rather than delegated to a plugin because we
  need per-route control of hreflang and canonical, and because the
  published SSG plugins still peer on react-router-dom v6.
*/

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");

const entry = pathToFileURL(join(root, "dist-server", "entry-server.js")).href;
const { render, head, allUrls, SITE } = await import(entry);

const template = await readFile(join(dist, "index.html"), "utf8");

function compose(url, locale) {
  return template
    .replace('<html lang="en">', `<html lang="${locale}">`)
    .replace("<!--app-head-->", head(url))
    .replace("<!--app-html-->", render(url));
}

const written = [];

for (const { url, locale } of allUrls()) {
  const out = url === "/" ? join(dist, "index.html") : join(dist, url, "index.html");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, compose(url, locale), "utf8");
  written.push(url);
}

// A genuine 404, not a routing trick. Rendered in the default locale.
await writeFile(join(dist, "404.html"), compose("/__not-found", "en"), "utf8");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...written.map((url) => `  <url><loc>${SITE}${url}</loc></url>`),
  "</urlset>",
].join("\n");

await writeFile(join(dist, "sitemap.xml"), sitemap, "utf8");

await writeFile(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
  "utf8",
);

console.log(`prerendered ${written.length} pages + 404, sitemap, robots`);
for (const url of written) console.log(`  ${url}`);
