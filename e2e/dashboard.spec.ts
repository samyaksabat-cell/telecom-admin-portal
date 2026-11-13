import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
  })

  test("should display dashboard KPI cards", async ({ page }) => {
    await expect(page.getByLabel("breadcrumb")).toBeVisible()

    const cards = page.locator("[data-slot='card']")
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test("should load dashboard data from API", async ({ page }) => {
    const dashboardResponse = page.waitForResponse(
      (response) => response.url().includes("/api/dashboard") && response.status() === 200
    )
    await page.reload()
    await dashboardResponse
  })

  test("should display charts", async ({ page }) => {
    const charts = page.locator(".recharts-wrapper")
    await expect(charts).toHaveCount(4)
    for (const chart of await charts.all()) {
      await expect(chart.locator("svg").first()).toBeVisible()
    }
  })
})
