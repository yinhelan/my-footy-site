import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://my-footy-site.pages.dev', // 改成你的自定义域名也可
  integrations: [react(), sitemap()],
})
