import type { NextConfig } from 'next'
import * as path from 'node:path'

const nextConfig: NextConfig = {
  // for docker https://github.com/vercel/next.js/tree/canary/examples/with-docker
  // output: 'standalone',
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src', 'app')
    return config
  },
}

export default nextConfig
