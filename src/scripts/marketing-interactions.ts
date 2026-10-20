import { initTablist } from "../lib/tablist";
import { initBridgeFlow } from "../lib/bridge-cycle";

// USMR 14.6: one small shared entry point for the three static routes.
document
  .querySelectorAll<HTMLElement>("[data-manual-tabs]")
  .forEach(initTablist);
document
  .querySelectorAll<HTMLElement>("[data-bridge-cycle]")
  .forEach(initBridgeFlow);
