import type { NextConfig } from 'next'
import * as path from 'node:path'

const nextConfig: NextConfig = {
  env: {
    SUPPORTED_LOCALES: process.env.SUPPORTED_LOCALES || 'en,fr,de',
  },
  // for docker https://github.com/vercel/next.js/tree/canary/examples/with-docker
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    swcPlugins: [['@lingui/swc-plugin', {}]],
    middlewarePrefetch: 'flexible',
  },
  webpack: (config) => {
    config.module.rules.push(
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
      (config.resolve.alias['@'] = path.join(__dirname, 'src', 'app'))
    return config
  },
}

export default nextConfig
