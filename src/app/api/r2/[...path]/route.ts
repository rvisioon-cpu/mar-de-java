import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Preserve byte ranges and stream the body; videos can be larger than Worker memory.
async function getFallbackAsset(request: NextRequest, path: string, rangeHeader: string | null) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const urls = r2PublicUrl ? [`${r2PublicUrl.replace(/\/$/, "")}/${encodedPath}`] : [];

  // Public files are available locally even when the emulated R2 bucket is empty.
  if (process.env.NODE_ENV === "development") {
    urls.unshift(new URL(`/${encodedPath}`, request.nextUrl.origin).toString());
  }

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: rangeHeader ? { range: rangeHeader } : {},
      });
      if (!response.ok && response.status !== 416) {
        await response.body?.cancel();
        continue;
      }

      const headers = new Headers();
      for (const name of ["content-type", "content-range", "content-length", "cache-control", "etag", "last-modified", "accept-ranges"]) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new NextResponse(response.body, { status: response.status, headers });
    } catch (error) {
      console.error("Asset fallback failed:", url, error);
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true }) as any;
    const resolvedParams = await params;
    if (resolvedParams.path.some(segment =>
      !segment || segment === "." || segment === ".." || /[/\\]/.test(segment)
    ) || resolvedParams.path[0] === "api") {
      return new NextResponse("Not Found", { status: 404 });
    }
    const path = resolvedParams.path.join("/");
    const rangeHeader = request.headers.get("range");

    if (!env || !env.R2) {
      return getFallbackAsset(request, path, rangeHeader);
    }


    // Si R2 binding está disponible
    let r2Range: any = undefined;
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const startStr = parts[0]?.trim();
      const endStr = parts[1]?.trim();

      const start = startStr ? parseInt(startStr, 10) : undefined;
      const end = endStr ? parseInt(endStr, 10) : undefined;

      if (start !== undefined && !isNaN(start)) {
        r2Range = {
          offset: start,
          length: (end !== undefined && !isNaN(end)) ? end - start + 1 : undefined
        };
      } else if (end !== undefined && !isNaN(end)) {
        r2Range = { suffix: end };
      }
    }

    const object = await env.R2.get(path, r2Range ? { range: r2Range } : undefined);

    if (object === null) {
      // A binding can exist while its local bucket is empty.
      return getFallbackAsset(request, path, rangeHeader);
    }

    const headers = new Headers();
    if (object.httpMetadata) {
      if (object.httpMetadata.contentType) headers.set("content-type", object.httpMetadata.contentType);
      if (object.httpMetadata.contentLanguage) headers.set("content-language", object.httpMetadata.contentLanguage);
      if (object.httpMetadata.contentDisposition) headers.set("content-disposition", object.httpMetadata.contentDisposition);
      if (object.httpMetadata.contentEncoding) headers.set("content-encoding", object.httpMetadata.contentEncoding);
      if (object.httpMetadata.cacheControl) headers.set("cache-control", object.httpMetadata.cacheControl);
    }
    if (object.httpEtag) {
      headers.set("etag", object.httpEtag);
    }
    
    headers.set("accept-ranges", "bytes");

    if (object.range) {
      const start = object.range.offset;
      const end = object.range.offset + (object.range.length ?? 0) - 1;
      const total = object.size;
      headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
      headers.set("Content-Length", (object.range.length ?? 0).toString());

      return new NextResponse(object.body, {
        status: 206,
        headers,
      });
    }

    headers.set("Content-Length", object.size.toString());
    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error("R2 Local API Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
