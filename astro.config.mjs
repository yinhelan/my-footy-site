import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://my-footy-site.pages.dev',
  trailingSlash: 'always',
  integrations: [tailwind({ applyBaseStyles: true }), sitemap()],
  vite: { build: { target: 'es2020' } },
});
