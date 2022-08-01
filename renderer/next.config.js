/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    // Important: return the modified config

    config.module.rules.push({
      test: /\.txt$/,
      use: "raw-loader",
    });

    return config;
  },
};

module.exports = nextConfig;
