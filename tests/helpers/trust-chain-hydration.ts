import { expect, type Page } from "@playwright/test";

const TRUST_CHAIN_ISLAND = "astro-island:has(.trust-chain__stage)";

export async function waitForTrustChainHydration(page: Page): Promise<void> {
  const island = page.locator(TRUST_CHAIN_ISLAND);
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", /.*/);
}
