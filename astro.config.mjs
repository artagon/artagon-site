import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.artagon.com',
  output: 'static',
  integrations: [sitemap()],
  vite: { }
});
