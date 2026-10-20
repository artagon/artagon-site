#!/usr/bin/env node
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { fileURLToPath } from "node:url";
import { walk } from "./lib/html-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildConfig = JSON.parse(
  readFileSync(path.join(__dirname, "..", "build.config.json"), "utf8"),
);
const distDir = path.resolve(buildConfig.dist);
const REMOTE_URL = /^(?:https?:)?\/\//i;
const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function isPathWithin(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
}

// USMR 14.21 (site-2m1.21): built route URLs follow trailingSlash="never",
// so nested index.html files map to /route rather than /route/.
function documentUrl(htmlPath) {
  const relativeHtml = path.relative(distDir, htmlPath).split(path.sep).join("/");
  let route;
  if (relativeHtml === "index.html") route = "/";
  else if (relativeHtml.endsWith("/index.html")) {
    route = `/${relativeHtml.slice(0, -"/index.html".length)}`;
  } else if (relativeHtml.endsWith(".html")) {
    route = `/${relativeHtml.slice(0, -".html".length)}`;
  } else {
    route = `/${relativeHtml}`;
  }
  return new URL(route, "https://postbuild.invalid");
}

function resolveLocalResource(htmlPath, rawUrl) {
  const url = rawUrl.trim();
  if (!url || REMOTE_URL.test(url) || URL_SCHEME.test(url)) return null;

  const pageUrl = documentUrl(htmlPath);
  const resourceUrl = new URL(url, pageUrl);
  if (resourceUrl.origin !== pageUrl.origin) return null;

  const pathname = decodeURIComponent(resourceUrl.pathname);
  const assetPath = path.resolve(distDir, `.${pathname}`);
  if (!isPathWithin(distDir, assetPath)) {
    throw new Error(`resolved path ${pathname} escapes the build output`);
  }
  return { assetPath, pathname: resourceUrl.pathname };
}

const hashBytes = (bytes) =>
  "sha256-" + crypto.createHash("sha256").update(bytes).digest("base64");

async function processHtml(htmlPath, manifest, realDistDir) {
  const $ = cheerio.load(await fs.readFile(htmlPath, "utf8"));
  const nodes = [
    ...$("script[src]").toArray(),
    ...$('link[rel="stylesheet"][href]').toArray(),
  ];
  let modified = false;
  for (const element of nodes) {
    const $element = $(element);
    const attribute = element.tagName === "link" ? "href" : "src";
    const url = $element.attr(attribute);
    if (!url) continue;

    const relativeHtml = path.relative(distDir, htmlPath).split(path.sep).join("/");
    let resource;
    try {
      resource = resolveLocalResource(htmlPath, url);
    } catch (error) {
      throw new Error(
        `[SRI] ${relativeHtml}: invalid local ${attribute} ${JSON.stringify(url)}: ${error.message}`,
        { cause: error },
      );
    }
    if (!resource) continue;

    let bytes;
    try {
      const realAssetPath = await fs.realpath(resource.assetPath);
      if (!isPathWithin(realDistDir, realAssetPath)) {
        throw new Error("resolved asset points outside the build output");
      }
      bytes = await fs.readFile(realAssetPath);
    } catch (error) {
      throw new Error(
        `[SRI] ${relativeHtml}: cannot read local ${attribute} ${JSON.stringify(url)} (resolved to ${resource.pathname}): ${error.message}`,
        { cause: error },
      );
    }

    // USMR 14.41 (site-2m1.41): only content-addressed Astro assets have
    // stable bytes for generated SRI; public URLs such as /assets/theme.css
    // remain readable and retain their stable URL without generated SRI.
    if (!resource.pathname.startsWith("/_astro/")) continue;

    const integrity = hashBytes(bytes);
    $element.attr("integrity", integrity);
    if (!$element.attr("crossorigin")) $element.attr("crossorigin", "anonymous");
    modified = true;
    manifest[resource.pathname] = integrity;
  }
  if (modified) await fs.writeFile(htmlPath, $.html(), "utf8");
}

(async () => {
  const manifest = {};
  const files = await walk(distDir);
  const realDistDir = await fs.realpath(distDir);
  for (const file of files) await processHtml(file, manifest, realDistDir);
  if (Object.keys(manifest).length) {
    await fs.writeFile(
      path.join(distDir, "sri-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  }
  console.log(`[SRI] files=${files.length} entries=${Object.keys(manifest).length}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
