#!/usr/bin/env node
/**
 * patch-worker.mjs
 *
 * Patches the OpenNext worker.js to serve static assets via env.ASSETS
 * and fall back to env.R2 when deployed on Cloudflare Pages.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const workerPath = join('.open-next', 'assets', '_worker.js');
const original = readFileSync(workerPath, 'utf-8');

// Add ASSETS-based and R2-based static file serving before the Next.js handler.
// Cloudflare Pages injects env.ASSETS and env.R2 automatically.
const patch = `
// Serve static assets via Cloudflare Pages ASSETS and R2 bindings
const url = new URL(request.url);
const pathname = url.pathname;

// NEXT_PUBLIC_* values are normally compiled into the browser bundle. Pages
// secrets exist only on the Worker at runtime, so expose this public Mapbox
// token through a tiny same-origin config response before the Next handler.
if (pathname === '/api/map-config') {
  return Response.json(
    { token: env.MAPBOX_ACCESS_TOKEN || env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '' },
    { headers: { 'cache-control': 'public, max-age=300, s-maxage=300' } }
  );
}

const hasExtension = /\\.[a-zA-Z0-9]+$/.test(pathname);
const isStaticPrefix = 
  pathname.startsWith('/_next/') ||
  pathname.startsWith('/building/') ||
  pathname.startsWith('/icons/') ||
  pathname.startsWith('/identity/') ||
  pathname.startsWith('/videos/') ||
  pathname.startsWith('/plants/') ||
  pathname.startsWith('/gallery/');
const isStaticFile = 
  pathname === '/favicon.ico' ||
  pathname === '/favicon.png' ||
  pathname === '/intro.jpg' ||
  pathname === '/portada_venecia.png' ||
  pathname === '/BUILD_ID';

const isStaticAsset = hasExtension || isStaticPrefix || isStaticFile;

if (isStaticAsset) {
  // 1. Try to serve from Pages assets (public folder / next static assets)
  if (env.ASSETS) {
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch (_) {
      // ignore and try next
    }
  }

  // 2. Try to serve from R2 bucket if not found in assets
  if (env.R2) {
    try {
      let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      if (key.startsWith('api/r2/')) {
        key = key.slice('api/r2/'.length);
      }

      // Objects uploaded via wrangler carry no contentType, so infer from extension.
      const R2_MIME = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
        pdf: 'application/pdf'
      };

      // HEAD first so range offsets are computed against the real object size.
      const head = await env.R2.head(key);
      if (head !== null) {
        const fileSize = head.size;
        const meta = head.httpMetadata || {};
        const ext = (key.split('.').pop() || '').toLowerCase();

        const headers = new Headers();
        headers.set('content-type', meta.contentType || R2_MIME[ext] || 'application/octet-stream');
        headers.set('accept-ranges', 'bytes');
        headers.set('cache-control', meta.cacheControl || 'public, max-age=31536000, immutable');
        if (meta.contentLanguage) headers.set('content-language', meta.contentLanguage);
        if (meta.contentDisposition) headers.set('content-disposition', meta.contentDisposition);
        if (meta.contentEncoding) headers.set('content-encoding', meta.contentEncoding);
        if (head.etag) headers.set('etag', head.etag);

        // Range request -> 206 Partial Content (required for video seeking)
        const rangeHeader = request.headers.get('range');
        const m = rangeHeader ? rangeHeader.match(/^bytes=(\\d*)-(\\d*)$/) : null;
        if (m) {
          // Open-ended ranges (bytes=N-) are capped to one chunk: asking R2 for
          // the whole remainder delays the first byte by seconds on large videos,
          // which makes the player stall. Clients just request the next chunk.
          const MAX_CHUNK = 8 * 1024 * 1024;
          let start;
          let end;
          if (m[1]) {
            start = parseInt(m[1], 10);
            end = m[2] ? parseInt(m[2], 10) : Math.min(start + MAX_CHUNK - 1, fileSize - 1);
          } else if (m[2]) {
            start = Math.max(0, fileSize - parseInt(m[2], 10));
            end = fileSize - 1;
          }

          if (start !== undefined) {
            end = Math.min(end, fileSize - 1);
            if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
              headers.set('content-range', 'bytes */' + fileSize);
              return new Response('Range Not Satisfiable', { status: 416, headers });
            }
            const length = end - start + 1;
            const ranged = await env.R2.get(key, { range: { offset: start, length } });
            if (ranged !== null) {
              headers.set('content-range', 'bytes ' + start + '-' + end + '/' + fileSize);
              headers.set('content-length', String(length));
              // Partial responses must not be cached as "immutable" for a year:
              // a bad/stale partial would then be pinned at the edge indefinitely.
              headers.set('cache-control', 'public, max-age=86400');
              return new Response(ranged.body, { status: 206, headers });
            }
          }
        }

        const object = await env.R2.get(key);
        if (object !== null) {
          headers.set('content-length', String(fileSize));
          return new Response(object.body, { headers });
        }
      }
    } catch (e) {
      console.error("R2 fallback worker error:", e);
    }
  }
}
`;

// Insert the patch right before the existing URL parsing
const insertBefore = 'const url = new URL(request.url);';

if (original.includes('// Patched by patch-worker.mjs')) {
  console.log('Worker already patched, skipping.');
  process.exit(0);
}

if (!original.includes(insertBefore)) {
  console.error('Could not find insertion point in worker.js');
  process.exit(1);
}

const patched = original.replace(
  insertBefore,
  `// Patched by patch-worker.mjs\n${patch}`
);

writeFileSync(workerPath, patched);
console.log('✅ Worker patched: static assets will be served via env.ASSETS and env.R2 fallback');
