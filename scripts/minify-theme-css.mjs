#!/usr/bin/env node
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildConfig = JSON.parse(
  readFileSync(path.join(__dirname, "..", "build.config.json"), "utf8"),
);

// USMR 14.5 (site-2m1.5): mutate only the deployed copy; the source and URL
// remain public/assets/theme.css and /assets/theme.css.
async function minifyThemeCss(root) {
  const distDir = path.resolve(root, buildConfig.dist);
  const cssPath = path.join(distDir, "assets", "theme.css");
  const source = await fs.readFile(cssPath, "utf8");
  const result = await transform(source, {
    loader: "css",
    minifyWhitespace: true,
    sourcefile: "assets/theme.css",
  });
  await fs.writeFile(cssPath, result.code, "utf8");
  return { cssPath, sourceBytes: Buffer.byteLength(source), outputBytes: Buffer.byteLength(result.code) };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));
  minifyThemeCss(root)
    .then(({ cssPath, sourceBytes, outputBytes }) => {
      console.log(`[theme-css] ${path.relative(root, cssPath)} ${sourceBytes} -> ${outputBytes} bytes`);
    })
    .catch((error) => {
      console.error(`[theme-css] ${error.message}`);
      process.exit(1);
    });
}
