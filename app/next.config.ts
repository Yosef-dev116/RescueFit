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

  /*
   * Baseline security headers. There is no auth cookie and no HTML sink in
   * this app, so these are cheap insurance rather than a fix for a known
   * hole. The CSP allows inline styles because Tailwind and next/font emit
   * them, and connect-src stays on 'self' because the browser only ever
   * calls this app's own routes.
   */
  async headers() {
    // React uses eval() in development only, for callstack reconstruction
    // and other debugging features. It never uses eval in production, so
    // the shipped policy stays strict and only the dev server relaxes.
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // The intake control uses a file input, not getUserMedia.
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline'",
              scriptSrc,
              "connect-src 'self'",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
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
