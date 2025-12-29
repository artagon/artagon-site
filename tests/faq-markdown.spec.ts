import { test, expect } from '@playwright/test';

test.describe('FAQ Markdown rendering', () => {
  test('renders answers as markdown HTML', async ({ page }) => {
    await page.goto('/faq');

    const firstItem = page.locator('.faq-item').first();
    await firstItem.locator('summary').click();

    const answer = firstItem.locator('.faq-answer');
    await expect(answer.locator('p')).toHaveCount(1);
    await expect(answer.locator('p')).toContainText('Artagon');
    await expect(answer.locator('strong', { hasText: 'OIDC 2.1/OpenID Provider' })).toHaveCount(1);
  });
});
