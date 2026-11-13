import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test("should navigate to all main pages", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Telecom Demo/)

    await page.goto("/dashboard")
    await expect(page.getByLabel("breadcrumb")).toBeVisible()

    await page.goto("/customers")
    await expect(page.locator("table")).toBeVisible()

    await page.goto("/plans")
    await expect(page.locator("table")).toBeVisible()

    await page.goto("/devices")
    await expect(page.locator("table")).toBeVisible()

    await page.goto("/usage")
    await expect(page.locator("table")).toBeVisible()

    await page.goto("/tickets")
    await expect(page.locator("table")).toBeVisible()
  })

  test("sidebar navigation works correctly", async ({ page }) => {
    // Development rendering of the full customer list can exceed the default wait under parallel load.
    const navigation = { timeout: 15000 }
    await page.goto("/dashboard")

    await page.getByRole("link", { name: /customers/i }).click()
    await expect(page).toHaveURL(/.*customers/, navigation)
    await expect(page.locator("table")).toBeVisible()

    await page.getByRole("link", { name: /plans/i }).click()
    await expect(page).toHaveURL(/.*plans/, navigation)
    await expect(page.locator("table")).toBeVisible()

    await page.getByRole("link", { name: /devices/i }).click()
    await expect(page).toHaveURL(/.*devices/, navigation)
    await expect(page.locator("table")).toBeVisible()
  })
})
