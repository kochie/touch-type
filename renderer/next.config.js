/**
 * @type {import('next').NextConfig}
 */

const { withSentryConfig } = require("@sentry/nextjs");

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore
  hideSourceMaps: false,

  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

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
    // console.log(config.module.rules);

    config.module.rules.push({
      test: /\.ttf$/,
      use: "url-loader",
    });

    return config;
  },
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
