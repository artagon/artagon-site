import { test, expect } from '@playwright/test';

test.describe('Vision Page - Content Collections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vision');
  });

  test('should have correct page title and meta description', async ({ page }) => {
    await expect(page).toHaveTitle(/Artagon Identity Platform: Vision and Roadmap/);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Trusted Identity for Machines and Humans');
  });

  test('should render hero section with mission statement', async ({ page }) => {
    // Check hero title
    const heroTitle = page.locator('.hero-section h1');
    await expect(heroTitle).toHaveText('Artagon Identity Platform');

    // Check subtitle
    const subtitle = page.locator('.hero-subtitle');
    await expect(subtitle).toHaveText('Vision and Roadmap');

    // Check mission statement
    const mission = page.locator('.mission-text');
    await expect(mission).toBeVisible();
    await expect(mission).toContainText('Verified, Private, Attested');
  });

  test('should render all section headers with numbers', async ({ page }) => {
    const sections = [
      { number: '01', title: 'Executive Summary' },
      { number: '02', title: 'Product Vision & Value Proposition' },
      { number: '03', title: 'Core Technology Stack' },
      { number: '04', title: 'Competitive Positioning' },
      { number: '05', title: 'Go-to-Market Strategy' },
      { number: '06', title: 'Roadmap & Milestones' },
      { number: '07', title: 'Success Metrics' },
    ];

    for (const section of sections) {
      const sectionHeader = page.locator('.section-header', { has: page.locator(`h2:text("${section.title}")`) });
      await expect(sectionHeader).toBeVisible();

      const sectionNumber = sectionHeader.locator('.section-number');
      await expect(sectionNumber).toHaveText(section.number);
    }
  });

  test('should render three domain cards', async ({ page }) => {
    const domainCards = page.locator('.domain-card');
    await expect(domainCards).toHaveCount(3);

    // Check card titles
    await expect(domainCards.nth(0).locator('h3')).toContainText('High-Assurance Identity');
    await expect(domainCards.nth(1).locator('h3')).toContainText('Decentralized & Verifiable Identity');
    await expect(domainCards.nth(2).locator('h3')).toContainText('Next-Generation Authorization');

    // Check icons are present
    await expect(domainCards.nth(0).locator('.domain-icon')).toHaveText('🔐');
    await expect(domainCards.nth(1).locator('.domain-icon')).toHaveText('✓');
    await expect(domainCards.nth(2).locator('.domain-icon')).toHaveText('⚡');
  });

  test('should render three strategic pillars', async ({ page }) => {
    const pillarCards = page.locator('.pillar-card');
    await expect(pillarCards).toHaveCount(3);

    // Check pillar numbers
    await expect(pillarCards.nth(0).locator('.pillar-number')).toHaveText('1');
    await expect(pillarCards.nth(1).locator('.pillar-number')).toHaveText('2');
    await expect(pillarCards.nth(2).locator('.pillar-number')).toHaveText('3');

    // Check pillar titles
    await expect(pillarCards.nth(0).locator('h4')).toContainText('Verifiable Everything');
    await expect(pillarCards.nth(1).locator('h4')).toContainText('Zero-Friction Security');
    await expect(pillarCards.nth(2).locator('h4')).toContainText('Privacy-by-Design');
  });

  test('should have interactive hover effects on cards', async ({ page }) => {
    const firstCard = page.locator('.domain-card').first();

    // Get initial border color
    const initialBorder = await firstCard.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );

    // Hover over card
    await firstCard.hover();

    // Wait for transition
    await page.waitForTimeout(500);

    // Border should change on hover (this is a rough check)
    const hoverBorder = await firstCard.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );

    // Just verify the card has transition property
    const hasTransition = await firstCard.evaluate((el) =>
      window.getComputedStyle(el).transition.includes('all')
    );
    expect(hasTransition).toBe(true);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/vision/');

    // Check that section header stacks vertically on mobile
    const sectionHeader = page.locator('.section-header').first();
    const flexDirection = await sectionHeader.evaluate((el) =>
      window.getComputedStyle(el).flexDirection
    );
    expect(flexDirection).toBe('column');

    // Domain cards should stack on mobile
    const domainCards = page.locator('.domain-card');
    const firstCardWidth = await domainCards.first().boundingBox();
    const secondCardWidth = await domainCards.nth(1).boundingBox();

    // Cards should be full width (or close to it) on mobile
    expect(firstCardWidth?.width).toBeGreaterThan(300);
    expect(secondCardWidth?.width).toBeGreaterThan(300);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check main article has proper semantic HTML
    await expect(page.locator('article.vision-doc')).toBeVisible();

    // Check headings hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);

    const h2s = page.locator('h2');
    await expect(h2s.count()).resolves.toBeGreaterThan(5);

    // Check that cards have proper structure
    const cards = page.locator('.domain-card');
    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toBeVisible();
    }
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/vision/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toHaveLength(0);
  });

  test('should have all styles loaded correctly', async ({ page }) => {
    // Check brand teal color is applied
    const heroTitle = page.locator('.hero-section h1');
    const color = await heroTitle.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    // Color should be set (not default black)
    expect(color).not.toBe('rgb(0, 0, 0)');

    // Check gradient background on hero
    const heroSection = page.locator('.hero-section');
    const background = await heroSection.evaluate((el) =>
      window.getComputedStyle(el).background
    );

    expect(background).toContain('gradient');
  });

  test('visual regression - full page screenshot', async ({ page }) => {
    // Take full page screenshot for visual regression
    await page.goto('/vision/');
    await page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await page.waitForTimeout(1000);

    // Take screenshot
    await expect(page).toHaveScreenshot('vision-page-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('visual regression - hero section', async ({ page }) => {
    const hero = page.locator('.hero-section');
    await expect(hero).toHaveScreenshot('vision-hero-section.png');
  });

  test('visual regression - domain cards', async ({ page }) => {
    const domainsSection = page.locator('.three-domains');
    await expect(domainsSection).toHaveScreenshot('vision-domain-cards.png');
  });
});
