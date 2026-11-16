import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    // .github/scripts tests use node:test and run in the Issue labels workflow.
    exclude: ["**/node_modules/**", "**/e2e/**", ".github/**"],
    reporters: ["default", "json", "junit"],
    outputFile: {
      json: "./test-results/results.json",
      junit: "./test-results/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: ["node_modules/**", "e2e/**", "**/*.config.*", "**/*.d.ts", "components/ui/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
