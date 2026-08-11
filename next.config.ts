import type { NextConfig } from 'next'

// Set BASE_PATH (e.g. /resume-builder) when hosting under a subpath.
const basePath = process.env.BASE_PATH || ''

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: {
    // exposed to the client so fetch() calls can prefix API URLs
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  serverExternalPackages: ['puppeteer-core', 'mongodb'],
}

export default nextConfig
