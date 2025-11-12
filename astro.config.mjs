import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.artagon.com',   // set to your canonical domain
  output: 'static',
  trailingSlash: 'never'
});
