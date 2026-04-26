import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Lighthouse Best Practices flags large first-party JS without source maps.
  // Cost is small for a static site; benefit is debuggable production stacks.
  productionBrowserSourceMaps: true,
};

export default config;
