import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTablist } from "../src/lib/tablist";
import { initBridgeFlow } from "../src/lib/bridge-cycle";

// DOM stand-ins exercise the production controllers, without a browser or
// a new DOM dependency. Browser focus/layout/AT remain coordinator checks.
class ElementStub extends EventTarget {
  id = "";
  dataset: Record<string, string> = {};
  hidden = false;
  disabled = true;
  tabIndex = -1;
  attributes = new Map<string, string>();
  classes = new Set<string>();
  classList = {
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, active: boolean) =>
      active ? this.classes.add(name) : this.classes.delete(name),
  };
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  focus() {
    this.dispatchEvent(new Event("focus"));
  }
}

function fire(
  target: EventTarget,
  type: string,
  props: Record<string, unknown> = {},
) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(props))
    Object.defineProperty(event, key, { value });
  target.dispatchEvent(event);
  return event;
}

describe("manual marketing tablists", () => {
  function fixture(vertical = false) {
    const tabs = Array.from({ length: 3 }, () => new ElementStub());
    const panels = tabs.map((tab, i) => {
      const panel = new ElementStub();
      panel.id = `panel-${i}`;
      tab.setAttribute("aria-controls", panel.id);
      tab.setAttribute("aria-selected", String(i === 0));
      return panel;
    });
    const root = {
      dataset: {},
      querySelectorAll: (selector: string) =>
        selector === '[role="tab"]' ? tabs : panels,
      querySelector: () => ({
        getAttribute: () => (vertical ? "vertical" : null),
      }),
    } as unknown as HTMLElement;
    return { root, tabs, panels };
  }

  it.each([false, true])(
    "separates focus from activation (vertical=%s)",
    (vertical) => {
      const { root, tabs, panels } = fixture(vertical);
      const cleanup = initTablist(root);
      expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
      expect(tabs.every((tab) => !tab.disabled)).toBe(true);
      fire(tabs[0]!, "keydown", { key: vertical ? "ArrowDown" : "ArrowRight" });
      expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
      expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
      expect(fire(tabs[1]!, "keydown", { key: " " }).defaultPrevented).toBe(
        true,
      );
      expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]);
      expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
      fire(tabs[1]!, "keydown", { key: "End" });
      expect(tabs[2]!.tabIndex).toBe(0);
      fire(tabs[2]!, "keydown", { key: "Enter" });
      expect(panels[2]!.hidden).toBe(false);
      fire(tabs[2]!, "keydown", { key: vertical ? "ArrowDown" : "ArrowRight" });
      expect(tabs[0]!.tabIndex).toBe(0);
      fire(tabs[0]!, "click");
      expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
      cleanup();
      fire(tabs[1]!, "click");
      expect(panels[1]!.hidden).toBe(true);
    },
  );

  it("fails before hiding content when a control has no panel", () => {
    const { root, tabs, panels } = fixture();
    tabs[1]!.setAttribute("aria-controls", "missing");
    expect(() => initTablist(root)).toThrow(/panel for every tab/);
    expect(panels.every((panel) => !panel.hidden)).toBe(true);
  });
});

describe("bridge cycle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function fixture(reduced = false, webdriver = false) {
    const motion = Object.assign(new EventTarget(), { matches: reduced });
    vi.stubGlobal("window", { matchMedia: () => motion });
    vi.stubGlobal("navigator", { webdriver });
    const steps = ["app", "wallet", "artagon", "app"].map((nodeId, i) => {
      const step = new ElementStub();
      step.dataset.nodeId = nodeId;
      if (i === 2) step.classes.add("is-active");
      return step;
    });
    const parties = ["app", "artagon", "wallet"].map((nodeId) => {
      const party = new ElementStub();
      party.dataset.nodeId = nodeId;
      return party;
    });
    const strip = Object.assign(new ElementStub(), {
      contains: (node: unknown) => steps.includes(node as ElementStub),
    });
    const root = {
      querySelectorAll: (selector: string) =>
        selector === ".bridge-step" ? steps : parties,
      querySelector: () => strip,
    } as unknown as HTMLElement;
    const active = () =>
      steps.findIndex((step) => step.classList.contains("is-active"));
    return { root, steps, parties, strip, motion, active };
  }

  it("pauses independently for pointer and focus and resets the delay after selection", () => {
    const { root, steps, parties, strip, active } = fixture();
    const cleanup = initBridgeFlow(root);
    expect(active()).toBe(2);
    vi.advanceTimersByTime(2100);
    fire(strip, "pointerenter");
    vi.advanceTimersByTime(5000);
    expect(active()).toBe(2);
    fire(strip, "focusin");
    fire(steps[0]!, "click");
    fire(strip, "pointerleave");
    vi.advanceTimersByTime(5000);
    expect(active()).toBe(0);
    fire(strip, "focusout", { relatedTarget: steps[1] });
    vi.advanceTimersByTime(5000);
    expect(active()).toBe(0);
    fire(strip, "focusout", { relatedTarget: null });
    vi.advanceTimersByTime(2199);
    expect(active()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(active()).toBe(1);
    expect(
      parties.find((party) => party.getAttribute("aria-current") === "step")
        ?.dataset.nodeId,
    ).toBe("wallet");
    cleanup();
    vi.advanceTimersByTime(5000);
    expect(active()).toBe(1);
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    "settles without cycling for reduced motion=%s, webdriver=%s",
    (reduced, webdriver) => {
      const { root, steps, active } = fixture(reduced, webdriver);
      const cleanup = initBridgeFlow(root);
      vi.advanceTimersByTime(10000);
      expect(active()).toBe(2);
      fire(steps[0]!, "click");
      vi.advanceTimersByTime(10000);
      expect(active()).toBe(0);
      cleanup();
    },
  );

  it("responds when reduced motion changes after initialization", () => {
    const { root, motion, active } = fixture();
    const cleanup = initBridgeFlow(root);
    motion.matches = true;
    fire(motion, "change");
    vi.advanceTimersByTime(10000);
    expect(active()).toBe(2);
    motion.matches = false;
    fire(motion, "change");
    vi.advanceTimersByTime(2200);
    expect(active()).toBe(3);
    cleanup();
  });
});
