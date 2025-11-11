#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
const distDir = "dist";
const isHttp = (u) => /^https?:\/\//i.test(u) || /^\/\//.test(u);
const clean = (u) => u.split("#")[0].split("?")[0];
const hashFile = async (fp) =>
  "sha256-" +
  crypto
    .createHash("sha256")
    .update(await fs.readFile(fp))
    .digest("base64");
async function processHtml(htmlPath, manifest) {
  const $ = cheerio.load(await fs.readFile(htmlPath, "utf8"));
  const nodes = [
    ...$("script[src]").toArray(),
    ...$('link[rel="stylesheet"][href]').toArray(),
  ];
  let mod = false;
  for (const el of nodes) {
    const $el = $(el);
    const attr = el.tagName === "link" ? "href" : "src";
    const url = $el.attr(attr);
    if (!url || isHttp(url)) continue;
    const local = clean(url).replace(/^\//, "");
    const asset = path.join(distDir, local);
    try {
      await fs.access(asset);
    } catch {
      continue;
    }
    const sri = await hashFile(asset);
    $el.attr("integrity", sri);
    if (!$el.attr("crossorigin")) $el.attr("crossorigin", "anonymous");
    mod = true;
    manifest["/" + local.replace(/\\/g, "/")] = sri;
  }
  if (mod) await fs.writeFile(htmlPath, $.html(), "utf8");
}
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
(async () => {
  const manifest = {};
  const files = await walk(distDir);
  for (const f of files) await processHtml(f, manifest);
  if (Object.keys(manifest).length)
    await fs.writeFile(
      path.join(distDir, "sri-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  console.log(
    `[SRI] files=${files.length} entries=${Object.keys(manifest).length}`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
