// astro.config.mjs
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://my-footy-site.pages.dev',
  integrations: [
    sitemap({
      // 从站点地图里排除 /debug/ 路径
      filter: (page) => !page.includes('/debug/'),
    }),
  ],
})
