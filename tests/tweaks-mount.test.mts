import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { isValidElement } from "react";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { DEFAULTS, STORAGE_KEY } from "../src/scripts/tweaks-state.ts";

const hooks = vi.hoisted(() => ({ effects: [] as (() => unknown)[] }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => [typeof initial === "function" ? initial() : initial, vi.fn()],
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
}));
import TweaksPanel from "../src/components/TweaksPanel.tsx";

describe("Tweaks hydration and explicit edits (USMR 14.13)", () => {
  let attrs: Map<string, string>;
  let storage: Map<string, string>;
  const setItem = vi.fn((key: string, value: string) => { storage.set(key, value); });
  const toggle = vi.fn();

  beforeEach(() => {
    // Vitest's unconfigured TSX transform uses the classic JSX runtime.
    vi.stubGlobal("React", React);
    hooks.effects.length = 0;
    attrs = new Map([["data-theme", "twilight"], ["data-accent", "cyan"], ["data-hero-font", "fraunces"]]);
    storage = new Map();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem } });
    vi.stubGlobal("document", {
      documentElement: { setAttribute: (key: string, value: string) => attrs.set(key, value) },
      body: { classList: { toggle } },
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

  function clickChoice(tree: unknown, choice: string): boolean {
    if (Array.isArray(tree)) return tree.some(child => clickChoice(child, choice));
    if (!isValidElement<Record<string, unknown>>(tree)) return false;
    if (tree.props.children === choice && typeof tree.props.onClick === "function") {
      tree.props.onClick();
      return true;
    }
    return clickChoice(tree.props.children, choice);
  }

  it("mount effects preserve BaseLayout attributes and empty storage", () => {
    const before = [...attrs];
    TweaksPanel();
    hooks.effects.forEach(effect => effect());
    expect([...attrs]).toEqual(before);
    expect(setItem).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });

  it("applies defaults and persists only after a user selects a choice", () => {
    const tree = TweaksPanel();
    hooks.effects.forEach(effect => effect());
    expect(clickChoice(tree, "light")).toBe(true);
    expect(attrs.get("data-theme")).toBe("light");
    expect(attrs.get("data-hero-font")).toBe(DEFAULTS.heroFont);
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, theme: "light" }));
  });

  it("restores saved choices before mount without rewriting storage on mount", () => {
    storage.set(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, theme: "light", heroFont: "dmserif" }));
    const source = readFileSync(new URL("../src/components/Tweaks.astro", import.meta.url), "utf8");
    const boot = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
    expect(boot).toBeDefined();
    runInNewContext(boot!, { localStorage: window.localStorage, document });
    TweaksPanel();
    hooks.effects.forEach(effect => effect());
    expect(attrs.get("data-theme")).toBe("light");
    expect(attrs.get("data-hero-font")).toBe("dmserif");
    expect(setItem).not.toHaveBeenCalled();
  });
});
