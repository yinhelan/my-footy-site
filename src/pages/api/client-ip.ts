import type { APIContext } from 'astro';

function first(value?: string | null) {
  return value ? value.split(',')[0].trim() : undefined;
}

export async function GET({ request }: APIContext) {
  const headers = request.headers;
  const ip =
    first(headers.get('x-forwarded-for')) ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    '127.0.0.1';

  return new Response(JSON.stringify({ ip }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
