'use strict';

function createNextConfig(options = {}) {
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    ...(options.legacyBuildLint === true ? { eslint: { ignoreDuringBuilds: true } } : {}),
    typescript: { ignoreBuildErrors: true },
    ...(options.optimizePackageImports === undefined
      ? {}
      : { experimental: { optimizePackageImports: options.optimizePackageImports } }),
    ...(options.overrides ?? {}),
  };
}

module.exports = { createNextConfig };
