import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose. It makes filesystem reads and
  // searchParams into runtime data that needs "use cache" or <Suspense>.
  // Three people build this app in one day, so we keep the simple model.
  // cacheComponents: true,
  // partialPrefetching: true,

  // Fahd writes JSON in public/data. API routes read it with fs, so the
  // files must be traced into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/*": ["./public/data/**/*.json"],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
