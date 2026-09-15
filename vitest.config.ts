import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "supabase/functions"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "src/app/**",
        "src/components/ui/**",
        "supabase/functions/**",
        "next.config.ts",
        "vitest.setup.ts",
        "src/lib/supabase/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
