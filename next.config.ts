import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  experimental: {
    proxyClientMaxBodySize: 100 * 1024 * 1024, // 100MB
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare')
    .then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev())
    .catch((err) => console.error('Error in initOpenNextCloudflareForDev:', err));
}

export default nextConfig;
