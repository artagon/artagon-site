import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { isValidElement } from "react";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { DEFAULTS, STORAGE_KEY, THEMES } from "../src/scripts/tweaks-state.ts";

const hooks = vi.hoisted(() => ({ effects: [] as (() => unknown)[], states: [] as unknown[], cursor: 0 }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.states[index], (next: unknown) => {
      hooks.states[index] = typeof next === "function" ? next(hooks.states[index]) : next;
    }];
  },
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
}));
import TweaksPanel from "../src/components/TweaksPanel.tsx";

function readBoot(path: string): string {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const boot = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  if (!boot) throw new Error(`Missing inline boot script: ${path}`);
  return boot;
}
const productionBoot = readBoot("../src/layouts/BaseLayout.astro");
const tweaksBoot = readBoot("../src/components/Tweaks.astro");

describe("Tweaks hydration and explicit edits (USMR 14.13)", () => {
  let attrs: Map<string, string>;
  let storage: Map<string, string>;
  const setItem = vi.fn((key: string, value: string) => { storage.set(key, value); });
  const toggle = vi.fn();

  beforeEach(() => {
    // Vitest's unconfigured TSX transform uses the classic JSX runtime.
    vi.stubGlobal("React", React);
    hooks.effects.length = 0;
    hooks.states.length = 0;
    hooks.cursor = 0;
    attrs = new Map([["data-theme", "twilight"], ["data-accent", "cyan"], ["data-hero-font", "fraunces"]]);
    storage = new Map();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem } });
    vi.stubGlobal("document", {
      documentElement: {
        dataset: { get theme() { return attrs.get("data-theme"); } },
        setAttribute: (key: string, value: string) => attrs.set(key, value),
      },
      body: { classList: { toggle } },
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

  function findChoice(tree: unknown, choice: string): React.ReactElement<Record<string, unknown>> | undefined {
    if (Array.isArray(tree)) {
      for (const child of tree) {
        const found = findChoice(child, choice);
        if (found) return found;
      }
      return undefined;
    }
    if (!isValidElement<Record<string, unknown>>(tree)) return undefined;
    if (tree.props.children === choice && typeof tree.props.onClick === "function") return tree;
    return findChoice(tree.props.children, choice);
  }

  function clickChoice(tree: unknown, choice: string): boolean {
    const onClick = findChoice(tree, choice)?.props.onClick;
    if (typeof onClick !== "function") return false;
    onClick();
    return true;
  }

  function renderPanel() {
    hooks.cursor = 0;
    return TweaksPanel();
  }

  function mountPanel() {
    renderPanel();
    hooks.effects.splice(0).forEach(effect => effect());
    return renderPanel();
  }

  // Exercise the actual production bootstrap before the actual Tweaks boot,
  // then assert the panel's selected option and its first unrelated edit.
  function assertRoundTrip(theme: string, boot = tweaksBoot): void {
    storage.set("artagon.theme", "midnight");
    const context = { localStorage: window.localStorage, document, URLSearchParams, location: { search: "" } };
    runInNewContext(productionBoot, context);
    expect(attrs.get("data-theme")).toBe("midnight");
    runInNewContext(boot, context);
    expect(attrs.get("data-theme")).toBe(theme);
    const tree = mountPanel();
    expect(findChoice(tree, theme)?.props.active).toBe(true);
    for (const other of THEMES.filter(value => value !== theme)) {
      expect(findChoice(tree, other)?.props.active).toBe(false);
    }
    expect(attrs.get("data-theme")).toBe(theme);
    expect(setItem).not.toHaveBeenCalled();
    expect(clickChoice(tree, "roomy")).toBe(true);
    expect(attrs.get("data-theme")).toBe(theme);
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toMatchObject({ theme, density: "roomy" });
    expect(storage.get("artagon.theme")).toBe("midnight");
  }

  it("mount effects preserve BaseLayout attributes and empty storage", () => {
    const before = [...attrs];
    mountPanel();
    expect([...attrs]).toEqual(before);
    expect(setItem).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });

  it("applies defaults and persists only after a user selects a choice", () => {
    const tree = mountPanel();
    expect(clickChoice(tree, "midnight")).toBe(true);
    expect(attrs.get("data-theme")).toBe("midnight");
    expect(attrs.get("data-hero-font")).toBe(DEFAULTS.heroFont);
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, theme: "midnight" }));
  });

  it("offers exactly the production themes", () => {
    for (const theme of THEMES) expect(clickChoice(mountPanel(), theme)).toBe(true);
    for (const theme of ["dark", "light"]) expect(clickChoice(mountPanel(), theme)).toBe(false);
  });

  it.each([
    ["absent", undefined],
    ["empty string", ""],
    ["empty object", "{}"],
    ["missing theme", JSON.stringify({ heroFont: "dmserif" })],
    ["legacy dark", JSON.stringify({ theme: "dark", heroFont: "dmserif" })],
    ["legacy light", JSON.stringify({ theme: "light", heroFont: "dmserif" })],
    ["invalid theme", JSON.stringify({ theme: "solar", heroFont: "dmserif" })],
    ["non-string theme", JSON.stringify({ theme: 42 })],
    ["null", "null"],
  ] as const)("preserves production midnight with %s Tweaks storage", (_label, raw) => {
    if (raw !== undefined) storage.set(STORAGE_KEY, raw);
    assertRoundTrip("midnight");
    if (raw?.includes("dmserif")) {
      expect(attrs.get("data-hero-font")).toBe("dmserif");
      expect(JSON.parse(storage.get(STORAGE_KEY)!)).toMatchObject({ heroFont: "dmserif" });
    }
  });

  it("preserves production midnight when Tweaks JSON is malformed", () => {
    storage.set(STORAGE_KEY, "{");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertRoundTrip("midnight");
    expect(warn).toHaveBeenCalledOnce();
  });

  it.each(THEMES)("valid stored Tweaks theme %s wins over the production choice", theme => {
    storage.set(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, theme, heroFont: "dmserif" }));
    assertRoundTrip(theme);
    expect(attrs.get("data-hero-font")).toBe("dmserif");
  });

  it("uses the tuple default when the page theme is invalid", () => {
    attrs.set("data-theme", "solar");
    storage.set(STORAGE_KEY, JSON.stringify({ theme: "light" }));
    const tree = mountPanel();
    expect(findChoice(tree, THEMES[0])?.props.active).toBe(true);
    expect(clickChoice(tree, "roomy")).toBe(true);
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toMatchObject({ theme: THEMES[0] });
  });

  it("negative control: detects a Tweaks boot that overwrites production midnight", () => {
    storage.set(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    const badBoot = tweaksBoot.replace("const html = document.documentElement;",
      'const html = document.documentElement; html.setAttribute("data-theme", "twilight");');
    expect(badBoot).not.toBe(tweaksBoot);
    expect(() => assertRoundTrip("midnight", badBoot)).toThrow();
  });

  it("matches SSR on the first hydration render, then restores the visible page theme", () => {
    const browserWindow = window;
    vi.stubGlobal("window", undefined);
    const serverTree = renderPanel();
    expect(findChoice(serverTree, "twilight")?.props.active).toBe(true);
    hooks.states.length = 0;
    hooks.effects.length = 0;
    vi.stubGlobal("window", browserWindow);
    attrs.set("data-theme", "midnight");
    const firstClientTree = renderPanel();
    for (const theme of THEMES) {
      expect(findChoice(firstClientTree, theme)?.props.active).toBe(findChoice(serverTree, theme)?.props.active);
    }
    hooks.effects.splice(0).forEach(effect => effect());
    expect(findChoice(renderPanel(), "midnight")?.props.active).toBe(true);
    expect(attrs.get("data-theme")).toBe("midnight");
    expect(setItem).not.toHaveBeenCalled();
  });
});
