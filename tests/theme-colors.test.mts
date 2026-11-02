// USMR 14.91: pre-paint colors must follow the CSS canvas tokens.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import { oklchToHex } from "../scripts/oklch-to-hex.mjs";
import { THEME_COLORS } from "../src/data/theme-colors.ts";
import { THEMES } from "../src/scripts/tweaks-state.ts";

function canvasHex(css: string, theme: keyof typeof THEME_COLORS): string {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...source.matchAll(new RegExp(
    `:root\\[data-theme=["']${theme}["']\\]\\s*\\{([^{}]*)\\}`, "g",
  ))];
  const declarations = blocks.flatMap(block => [...block[1]!.matchAll(/(?:^|;)\s*--bg\s*:\s*([^;]+);/g)]);
  if (declarations.length !== 1) throw new Error(`Expected one ${theme} canvas token, found ${declarations.length}`);
  const match = declarations[0]![1]!.trim().match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s*\)$/);
  if (!match) throw new Error(`Unsupported ${theme} canvas token`);
  return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

const css = readFileSync(new URL("../public/assets/theme.css", import.meta.url), "utf8");

describe("theme-color canvas parity", () => {
  test("map keys match the allowed theme vocabulary", () => {
    expect(Object.keys(THEME_COLORS)).toEqual(THEMES);
  });

  test.each(["twilight", "midnight"] as const)("%s matches its CSS token", theme => {
    expect(canvasHex(css, theme)).toBe(THEME_COLORS[theme]);
  });

  test("detects a changed canvas token", () => {
    const changed = css.replace("--bg: oklch(0.12 0.020 195)", "--bg: oklch(0.3 0.020 195)");
    expect(changed).not.toBe(css);
    expect(canvasHex(changed, "midnight")).not.toBe(THEME_COLORS.midnight);
  });

  test("accepts the same selector inside a layer and rejects duplicate canvas declarations", () => {
    const rule = ':root[data-theme="midnight"] { --bg: oklch(0.12 0.020 195); }';
    expect(canvasHex(rule, "midnight")).toBe(THEME_COLORS.midnight);
    expect(canvasHex(`@layer tokens { ${rule} }`, "midnight")).toBe(THEME_COLORS.midnight);
    expect(() => canvasHex(`${rule} ${rule}`, "midnight")).toThrow("found 2");
  });
});

test("dev Tweaks restore synchronizes without persisting the production choice", () => {
  const source = readFileSync(new URL("../src/components/Tweaks.astro", import.meta.url), "utf8");
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeTruthy();
  const calls: unknown[][] = [];
  const attributes = new Map<string, string>();
  runInNewContext(script!, {
    localStorage: { getItem: () => JSON.stringify({ theme: "midnight" }) },
    window: { __setTheme: (...args: unknown[]) => calls.push(args) },
    document: { documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value) } },
  });
  expect(calls).toEqual([["midnight", false]]);
  expect(attributes.has("data-theme")).toBe(false);
});

test("inline bootstrap preserves a URL choice when persistence fails", () => {
  const layout = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const scripts = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)];
  expect(scripts).toHaveLength(2);
  const attrs = new Map<string, string>([["data-theme-colors", JSON.stringify(THEME_COLORS)]]);
  const contents = ["", "", ""];
  const metas = contents.map((_value, index) => ({
    setAttribute: (_name: string, value: string) => { contents[index] = value; },
  }));
  const context = {
    URLSearchParams,
    location: { search: "?theme=midnight&persist=1" },
    localStorage: {
      getItem: () => "twilight",
      setItem: () => { throw new Error("storage blocked"); },
    },
    document: {
      documentElement: {
        getAttribute: (name: string) => attrs.get(name) ?? null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
      },
      querySelectorAll: (selector: string) => selector.startsWith("meta") ? metas : [],
    },
    window: { __setTheme: (_theme: string) => {} },
  };
  runInNewContext(scripts[0]![1]!, context);
  expect(attrs.get("data-theme")).toBe("midnight");
  expect(contents).toEqual(Array(3).fill(THEME_COLORS.midnight));
  runInNewContext(scripts[1]![1]!, context);
  context.window.__setTheme("twilight");
  expect(attrs.get("data-theme")).toBe("twilight");
  expect(contents).toEqual(Array(3).fill(THEME_COLORS.twilight));
});

test.each([
  ["missing attribute", null],
  ["missing theme key", JSON.stringify({ twilight: THEME_COLORS.twilight })],
  ["non-string theme value", JSON.stringify({ midnight: 42 })],
  ["malformed JSON", "{"],
])("missing or invalid map (%s) preserves metadata for bootstrap and setter", (_case, raw) => {
  const layout = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const scripts = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)];
  expect(scripts).toHaveLength(2);
  const attrs = new Map<string, string>([["data-theme", "twilight"]]);
  const initial = ["#111111", "#222222", "#333333"];
  const contents = [...initial];
  const writes: string[] = [];
  const metas = contents.map((_value, index) => ({
    setAttribute: (_name: string, value: unknown) => {
      writes.push(String(value));
      contents[index] = String(value);
    },
  }));
  const context = {
    URLSearchParams,
    location: { search: "?theme=midnight" },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      documentElement: {
        getAttribute: (name: string) => name === "data-theme-colors" ? raw : null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
      },
      querySelectorAll: (selector: string) => selector.startsWith("meta") ? metas : [],
    },
    window: { __setTheme: (_theme: string) => {} },
  };
  runInNewContext(scripts[0]![1]!, context);
  expect(attrs.get("data-theme")).toBe("midnight");
  expect(contents).toEqual(initial);
  expect(writes).toEqual([]);
  attrs.set("data-theme", "twilight");
  runInNewContext(scripts[1]![1]!, context);
  context.window.__setTheme("midnight");
  expect(attrs.get("data-theme")).toBe("midnight");
  expect(contents).toEqual(initial);
  expect(writes).toEqual([]);
});
