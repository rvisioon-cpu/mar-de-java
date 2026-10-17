// Public showroom media only. Personal uploads and application responses never
// enter this cache. Partial bodies use a separate key and are stored as 200.
const PUBLIC_MEDIA = /^(building|homepage|videos|amenities|location|plants\/details|gallery)\/.+\.(mp4|webm|mov|ogg|avi|webp|png|jpe?g|gif|svg|avif)$/i;
const MAX_BODY = 8 * 1024 * 1024;
const MIME = {mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',webp:'image/webp',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',gif:'image/gif',avif:'image/avif',ogg:'video/ogg',avi:'video/x-msvideo'};

function output(body, headers, status, request, state) {
  const result = new Headers(headers);
  result.set('x-media-cache', state);
  if (!request.headers.has('range') && request.headers.get('if-none-match')?.split(/,\s*/).some(tag => tag === '*' || tag.replace(/^W\//, '') === result.get('etag'))) {
    result.delete('content-length');
    return new Response(null, {status:304, headers:result});
  }
  return new Response(request.method === 'HEAD' ? null : body, {status, headers:result});
}

export async function serveR2Media(request, env, ctx) {
  const url = new URL(request.url);
  if (!['GET', 'HEAD'].includes(request.method) || !url.pathname.startsWith('/api/r2/') || !env.R2) return null;
  let key;
  try { key = decodeURIComponent(url.pathname.slice(8)); } catch { return new Response('Not Found', {status:404}); }
  if (key.split('/').some(part => !part || part === '.' || part === '..' || part.includes('\\')) || !PUBLIC_MEDIA.test(key)) return null;
  const range = request.headers.get('range');
  // Never allow a user query to collide with the internal segment key.
  const cacheUrl = new URL(url.origin + '/__showroom_media_cache/v1/' + key.split('/').map(encodeURIComponent).join('/'));
  cacheUrl.searchParams.set('query', url.search);
  cacheUrl.searchParams.set('range', range || 'full');
  const cacheKey = new Request(cacheUrl, {method:'GET'});
  const cache = globalThis.caches?.default;
  const canLookup = !request.headers.has('if-range') && !request.headers.get('cache-control')?.includes('no-cache');
  if (cache && canLookup) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const headers = new Headers(hit.headers);
        const status = headers.has('x-stored-content-range') ? 206 : 200;
        if (status === 206) headers.set('content-range', headers.get('x-stored-content-range'));
        headers.delete('x-stored-content-range');
        headers.set('etag', headers.get('x-public-etag'));
        headers.delete('x-public-etag');
        return output(hit.body, headers, status, request, 'HIT');
      }
    } catch (error) { console.error('Media cache read failed', error); }
  }
  const head = await env.R2.head(key);
  if (!head) return null; // Preserve the existing local/public fallback when a bucket is empty.
  const headers = new Headers();
  head.writeHttpMetadata(headers);
  headers.set('content-type', headers.get('content-type') || MIME[key.split('.').pop().toLowerCase()] || 'application/octet-stream');
  headers.set('etag', head.httpEtag);
  headers.set('last-modified', head.uploaded.toUTCString());
  headers.set('accept-ranges', 'bytes');
  const privatePolicy = /private|no-store|no-cache/i.test(headers.get('cache-control') || '');
  if (!privatePolicy) headers.set('cache-control', 'public, max-age=3600, must-revalidate');
  let offset = 0, length = head.size, status = 200;
  const ifRange = request.headers.get('if-range');
  const useRange = range && (!ifRange || ifRange === head.httpEtag || ifRange === head.uploaded.toUTCString());
  if (useRange) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      offset = match[1] ? Number(match[1]) : Math.max(0, head.size - Number(match[2]));
      const end = match[1] ? (match[2] ? Math.min(Number(match[2]), head.size - 1) : Math.min(offset + MAX_BODY - 1, head.size - 1)) : head.size - 1;
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset > end || offset >= head.size) {
        headers.set('content-range', `bytes */${head.size}`);
        return new Response(null, {status:416, headers});
      }
      length = end - offset + 1;
      status = 206;
      headers.set('content-range', `bytes ${offset}-${end}/${head.size}`);
    }
    // Malformed/multiple ranges are ignored: serve a complete 200 response.
  }
  headers.set('content-length', String(length));
  if (request.method === 'HEAD') return output(null, headers, status, request, 'BYPASS');
  if (!range && request.headers.get('if-none-match') === head.httpEtag) return output(null, headers, status, request, 'MISS');
  const object = await env.R2.get(key, status === 206 ? {range:{offset,length}} : undefined);
  if (!object) return new Response('Not Found', {status:404, headers:{'cache-control':'no-store'}});
  const response = new Response(object.body, {status, headers});
  if (cache && !privatePolicy && !ifRange && length <= MAX_BODY) {
    const storedHeaders = new Headers(headers);
    // Cache API rejects 206. The segment is isolated from full objects and is
    // restored to a real 206 only when serving this exact Range request.
    if (status === 206) {
      storedHeaders.set('x-stored-content-range', headers.get('content-range'));
      storedHeaders.delete('content-range');
    }
    storedHeaders.delete('etag'); // Avoid validators against an internal segment.
    storedHeaders.set('x-public-etag', head.httpEtag);
    // Keep the public ETag separately so cache.match cannot transform a segment.
    const clone = response.clone();
    ctx.waitUntil(cache.put(cacheKey, new Response(clone.body, {headers:storedHeaders})).catch(error => console.error('Media cache write failed', error)));
  }
  return output(response.body, headers, status, request, cache && !privatePolicy && length <= MAX_BODY ? 'MISS' : 'BYPASS');
}
