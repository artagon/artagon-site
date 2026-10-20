/** Pause glow-tag animations while their host is outside the viewport. */
export function pauseOffscreenGlows(
  roots: Element | readonly Element[],
): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};

  const rootElements: readonly Element[] = Array.isArray(roots) ? roots : [roots];
  const hosts = new Set<Element>();

  for (const root of rootElements) {
    if (root.matches(".glow-tag")) hosts.add(root);
    for (const host of root.querySelectorAll(".glow-tag")) hosts.add(host);
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.removeAttribute("data-glow-paused");
      } else {
        entry.target.setAttribute("data-glow-paused", "");
      }
    }
  });

  for (const host of hosts) {
    // Hosts begin visible so animation continues until the first observer result.
    host.removeAttribute("data-glow-paused");
    observer.observe(host);
  }

  return () => observer.disconnect();
}
