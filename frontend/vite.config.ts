import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // FE-17 (2026-09-19) — `e2e/*.spec.ts` là test Playwright (chạy qua
    // `npx playwright test`, cần trình duyệt thật + backend thật), KHÔNG
    // phải unit test — vitest mặc định match CẢ `*.spec.ts` lẫn `*.test.ts`
    // nên tự nhặt nhầm nếu không loại trừ tường minh (mirror cách
    // `jest.e2e.config.js` tách biệt E2E khỏi `jest.config.js` ở backend).
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
