export const prerender = true;

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Sitemap: https://my-footy-site.pages.dev/sitemap-index.xml',
    'Disallow: /debug/',
    `# build ${new Date().toISOString()}`
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate'
    }
  });
}
