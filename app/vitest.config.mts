import { defineConfig } from "vitest/config";
import path from "node:path";

// The app has no vite react plugin. The tests cover plain TypeScript only.
// The alias makes "@/..." imports work the same way they do in Next.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
