// USMR 14.6 / 14.54: a small cycle controller; data and glossary stay in
// server-rendered markup. Pointer and focus pauses are independent.
export function initBridgeFlow(root: HTMLElement): () => void {
  const steps = [...root.querySelectorAll<HTMLButtonElement>(".bridge-step")];
  const parties = [...root.querySelectorAll<HTMLElement>(".bridge-party")];
  const strip = root.querySelector<HTMLElement>(".bridge-flow__steps");
  if (
    !steps.length ||
    !strip ||
    steps.some(
      (step) =>
        !parties.some((party) => party.dataset.nodeId === step.dataset.nodeId),
    )
  ) {
    throw new Error("Bridge steps require a matching party");
  }
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let step = Math.max(
    0,
    steps.findIndex((button) => button.classList.contains("is-active")),
  );
  let pointerWithin = false;
  let focusWithin = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const select = (index: number) => {
    step = index;
    steps.forEach((button, i) => {
      button.classList.toggle("is-active", i === step);
      button.classList.toggle("is-past", i < step);
      if (i === step) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    parties.forEach((party) => {
      const active = party.dataset.nodeId === steps[step]!.dataset.nodeId;
      party.classList.toggle("is-active", active);
      if (active) party.setAttribute("aria-current", "step");
      else party.removeAttribute("aria-current");
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    if (pointerWithin || focusWithin || motion.matches || navigator.webdriver)
      return;
    timer = setTimeout(() => {
      select((step + 1) % steps.length);
      schedule();
    }, 2200);
  };
  const enter = () => {
    pointerWithin = true;
    schedule();
  };
  const leave = () => {
    pointerWithin = false;
    schedule();
  };
  const focus = () => {
    focusWithin = true;
    schedule();
  };
  const blur = (event: FocusEvent) => {
    focusWithin = strip.contains(event.relatedTarget as Node | null);
    schedule();
  };
  const clicks = steps.map((button, i) => {
    const click = () => {
      select(i);
      schedule();
    };
    button.addEventListener("click", click);
    button.disabled = false;
    return () => button.removeEventListener("click", click);
  });
  strip.addEventListener("pointerenter", enter);
  strip.addEventListener("pointerleave", leave);
  strip.addEventListener("focusin", focus);
  strip.addEventListener("focusout", blur);
  motion.addEventListener("change", schedule);
  select(step);
  schedule();
  return () => {
    clearTimeout(timer);
    clicks.forEach((cleanup) => cleanup());
    strip.removeEventListener("pointerenter", enter);
    strip.removeEventListener("pointerleave", leave);
    strip.removeEventListener("focusin", focus);
    strip.removeEventListener("focusout", blur);
    motion.removeEventListener("change", schedule);
  };
}
