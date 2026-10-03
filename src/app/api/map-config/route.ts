import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  try {
    const { env } = (await getCloudflareContext({ async: true })) as any;
    token = env?.MAPBOX_ACCESS_TOKEN || env?.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || token;
  } catch {
    // Local Next.js development does not always have a Cloudflare context.
  }

  return NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
