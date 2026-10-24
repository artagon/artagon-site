import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { pauseOffscreenGlows } from "../src/lib/glow-pause";

class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | undefined;

  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.latest = this;
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  report(target: Element, isIntersecting: boolean): void {
    this.callback(
      [{ target, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function fakeElement({
  glowTag = false,
  children = [],
  initiallyPaused = false,
}: {
  glowTag?: boolean;
  children?: Element[];
  initiallyPaused?: boolean;
} = {}): Element & { hasAttribute(name: string): boolean } {
  const attributes = new Set<string>();
  if (initiallyPaused) attributes.add("data-glow-paused");

  return {
    matches: vi.fn((selector: string) => glowTag && selector === ".glow-tag"),
    querySelectorAll: vi.fn((selector: string) =>
      selector === ".glow-tag" ? children : [],
    ),
    setAttribute: vi.fn((name: string) => attributes.add(name)),
    removeAttribute: vi.fn((name: string) => attributes.delete(name)),
    hasAttribute: (name: string) => attributes.has(name),
  } as unknown as Element & { hasAttribute(name: string): boolean };
}

describe("pauseOffscreenGlows", () => {
  beforeEach(() => {
    FakeIntersectionObserver.latest = undefined;
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("pauses out-of-view hosts and resumes intersecting hosts", () => {
    const first = fakeElement({ glowTag: true, initiallyPaused: true });
    const second = fakeElement({ glowTag: true });
    const root = fakeElement({ children: [first, second] });

    pauseOffscreenGlows(root);

    const observer = FakeIntersectionObserver.latest;
    expect(observer?.observed).toEqual([first, second]);
    expect(first.hasAttribute("data-glow-paused")).toBe(false);
    expect(second.hasAttribute("data-glow-paused")).toBe(false);

    observer?.report(first, false);
    expect(first.hasAttribute("data-glow-paused")).toBe(true);

    observer?.report(first, true);
    expect(first.hasAttribute("data-glow-paused")).toBe(false);
  });

  test("does nothing when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const root = fakeElement({ initiallyPaused: true });

    const disconnect = pauseOffscreenGlows(root);

    expect(root.matches).not.toHaveBeenCalled();
    expect(root.querySelectorAll).not.toHaveBeenCalled();
    expect(root.hasAttribute("data-glow-paused")).toBe(true);
    expect(disconnect).toBeTypeOf("function");
    disconnect();
  });

  test("returns a function that disconnects the observer", () => {
    const root = fakeElement({ children: [fakeElement({ glowTag: true })] });
    const disconnect = pauseOffscreenGlows(root);

    disconnect();

    expect(FakeIntersectionObserver.latest?.disconnected).toBe(true);
  });
});
