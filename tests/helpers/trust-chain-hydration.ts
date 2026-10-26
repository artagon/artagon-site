import { expect, type Page } from "@playwright/test";

const TRUST_CHAIN_ISLAND = "astro-island:has(.trust-chain__stage)";
// Allow the slowest emulated devices, especially Mobile Safari, time to
// hydrate under CI host load.
const HYDRATION_TIMEOUT_MS = 15_000;

/** Waits for the final decision without scrolling; safe before a screenshot. */
export async function waitForTrustChainFinalDecision(
  page: Page,
): Promise<void> {
  const trustChain = page.locator(".trust-chain");
  await expect(trustChain).not.toHaveAttribute(
    "data-decision-final",
    "pending",
    { timeout: HYDRATION_TIMEOUT_MS },
  );
}

export async function waitForTrustChainHydration(page: Page): Promise<void> {
  const island = page.locator(TRUST_CHAIN_ISLAND);
  const trustChain = page.locator(".trust-chain");
  await trustChain.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", /.*/, {
    timeout: HYDRATION_TIMEOUT_MS,
  });
  await waitForTrustChainFinalDecision(page);
}
