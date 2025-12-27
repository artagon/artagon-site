import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Content Collections - Schema Validation', () => {
  const contentPath = 'src/content/pages/vision.mdx';
  const backupPath = 'src/content/pages/vision.mdx.backup';

  test.beforeAll(() => {
    // Backup original file
    fs.copyFileSync(contentPath, backupPath);
  });

  test.afterAll(() => {
    // Restore original file
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, contentPath);
      fs.unlinkSync(backupPath);
    }
  });

  test('should validate required frontmatter fields', () => {
    // Create invalid content (missing title)
    const invalidContent = `---
description: "Test description"
hero:
  title: "Test"
  subtitle: "Test"
  missionText: "Test"
---

Test content
`;

    fs.writeFileSync(contentPath, invalidContent);

    // Try to build - should fail
    try {
      execSync('npm run build', { stdio: 'pipe' });
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      // Build should fail with validation error
      expect(error.status).not.toBe(0);
      expect(error.stderr.toString()).toContain('title');
    }

    // Restore backup
    fs.copyFileSync(backupPath, contentPath);
  });

  test('should validate hero object schema', () => {
    // Create content with invalid hero structure
    const invalidContent = `---
title: "Test Title"
description: "Test description"
hero:
  title: "Test"
  # Missing subtitle and missionText
---

Test content
`;

    fs.writeFileSync(contentPath, invalidContent);

    // Try to build - should fail
    try {
      execSync('npm run build', { stdio: 'pipe' });
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      // Build should fail with validation error
      expect(error.status).not.toBe(0);
    }

    // Restore backup
    fs.copyFileSync(backupPath, contentPath);
  });

  test('should accept valid frontmatter', () => {
    // Create valid content
    const validContent = `---
title: "Valid Title"
description: "Valid description"
hero:
  title: "Valid Hero Title"
  subtitle: "Valid Subtitle"
  missionText: "Valid Mission"
---

# Valid Content

This is valid markdown content.
`;

    fs.writeFileSync(contentPath, validContent);

    // Build should succeed
    const result = execSync('npm run build', { stdio: 'pipe' });
    expect(result).toBeTruthy();

    // Restore backup
    fs.copyFileSync(backupPath, contentPath);
  });

  test('should allow optional hero field', () => {
    // Create valid content without hero
    const validContent = `---
title: "Valid Title"
description: "Valid description"
---

# Valid Content Without Hero

This is valid markdown content without a hero section.
`;

    fs.writeFileSync(contentPath, validContent);

    // Build should succeed
    const result = execSync('npm run build', { stdio: 'pipe' });
    expect(result).toBeTruthy();

    // Restore backup
    fs.copyFileSync(backupPath, contentPath);
  });
});

test.describe('Content Collections - File Structure', () => {
  test('should have content config file', () => {
    const configPath = 'src/content/config.ts';
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('defineCollection');
    expect(content).toContain('pages');
  });

  test('should have vision.mdx in pages collection', () => {
    const visionPath = 'src/content/pages/vision.mdx';
    expect(fs.existsSync(visionPath)).toBe(true);

    const content = fs.readFileSync(visionPath, 'utf-8');
    expect(content).toContain('---'); // Has frontmatter
    expect(content).toContain('title:');
    expect(content).toContain('description:');
  });

  test('vision page should use getEntry API', () => {
    const pagePath = 'src/pages/vision/index.astro';
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain("import { getEntry } from 'astro:content'");
    expect(content).toContain("getEntry('pages', 'vision')");
    expect(content).toContain('await entry.render()');
  });
});
