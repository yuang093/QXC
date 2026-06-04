/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SQLite 必須在 server-side 執行
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // 允許 better-sqlite3 native module
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3'];
    }
    return config;
  },
};

module.exports = nextConfig;
