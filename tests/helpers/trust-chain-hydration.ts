import { expect, type Page } from "@playwright/test";

const TRUST_CHAIN_ISLAND = "astro-island:has(.trust-chain__stage)";

export async function waitForTrustChainHydration(page: Page): Promise<void> {
  const island = page.locator(TRUST_CHAIN_ISLAND);
  const trustChain = page.locator(".trust-chain");
  await trustChain.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", /.*/);
  await expect(trustChain).not.toHaveAttribute(
    "data-decision-final",
    "pending",
  );
}
