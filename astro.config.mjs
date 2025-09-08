import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://my-footy-site.vercel.app/',
  integrations: [sitemap()],
})
