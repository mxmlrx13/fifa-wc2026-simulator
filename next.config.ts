import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Disable source map upload — avoids needing SENTRY_AUTH_TOKEN at build time
  sourcemaps: { disable: true },
  // Suppress Sentry CLI logs during build
  silent: true,
});
