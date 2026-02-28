import type { NextConfig } from 'next'
import * as path from 'node:path'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPPORTED_LOCALES: process.env.NEXT_PUBLIC_SUPPORTED_LOCALES,
    NEXT_PUBLIC_ORCID_URL: process.env.NEXT_PUBLIC_ORCID_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_CAS_URL: process.env.NEXT_PUBLIC_CAS_URL,
    NEXT_PUBLIC_INSTITUTION_NAME: process.env.NEXT_PUBLIC_INSTITUTION_NAME,
    NEXT_PUBLIC_ORCID_SCOPES: process.env.NEXT_PUBLIC_ORCID_SCOPES,
    NEXT_PUBLIC_ORCID_CLIENT_ID: process.env.NEXT_PUBLIC_ORCID_CLIENT_ID,
  },
  // for docker https://github.com/vercel/next.js/tree/canary/examples/with-docker
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    swcPlugins: [['@lingui/swc-plugin', {}]],
    middlewarePrefetch: 'flexible',
  },
  webpack: (config) => {
    ;(config.module.rules.push(
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.po$/,
        use: {
          loader: '@lingui/loader',
        },
      },
    ),
      (config.resolve.alias['@'] = path.join(__dirname, 'src', 'app')))
    return config
  },
}

export default nextConfig
