// USMR 14.6: shared WAI-ARIA manual activation. Focus and selection are
// separate; native buttons retain pointer, keyboard, and touch parity.
export function initTablist(root: HTMLElement): () => void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const vertical =
    root.querySelector('[role="tablist"]')?.getAttribute("aria-orientation") ===
    "vertical";
  if (
    !tabs.length ||
    tabs.some(
      (tab) =>
        !panels.some((panel) => panel.id === tab.getAttribute("aria-controls")),
    )
  ) {
    throw new Error("Tablist requires a panel for every tab");
  }
  const cleanups: Array<() => void> = [];
  const rove = (index: number) =>
    tabs.forEach((tab, i) => {
      tab.tabIndex = i === index ? 0 : -1;
    });
  const select = (index: number) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.classList.toggle("is-selected", active);
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== tabs[index]!.getAttribute("aria-controls");
    });
    rove(index);
  };
  const initial = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"),
  );
  tabs.forEach((tab, i) => {
    const click = () => select(i);
    const focus = () => rove(i);
    const keydown = (event: KeyboardEvent) => {
      let next: number;
      if (event.key === (vertical ? "ArrowUp" : "ArrowLeft"))
        next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === (vertical ? "ArrowDown" : "ArrowRight"))
        next = (i + 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(i);
        return;
      } else return;
      event.preventDefault();
      tabs[next]!.focus();
    };
    tab.addEventListener("click", click);
    tab.addEventListener("focus", focus);
    tab.addEventListener("keydown", keydown);
    tab.disabled = false;
    cleanups.push(() => {
      tab.removeEventListener("click", click);
      tab.removeEventListener("focus", focus);
      tab.removeEventListener("keydown", keydown);
    });
  });
  select(initial);
  root.dataset.tabsReady = "true";
  return () => cleanups.forEach((cleanup) => cleanup());
}
