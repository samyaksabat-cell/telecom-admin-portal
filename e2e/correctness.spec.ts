import { test, expect } from "@playwright/test"

test("customer deletion keeps the server conflict visible", async ({ page }) => {
  await page.route("**/api/customers/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue()
    await route.fulfill({
      status: 409,
      json: { detail: "Customer has history and cannot be deleted" },
    })
  })
  await page.goto("/customers")
  const rows = page.locator("tbody tr")
  await rows.first().getByRole("button").nth(1).click()
  const dialog = page.getByRole("alertdialog")
  await dialog.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(dialog.getByRole("alert")).toHaveText("Customer has history and cannot be deleted")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).not.toBeVisible()
  await expect(rows.first()).toBeVisible()
})

test("a failed save leaves the plan form open with its entered values", async ({ page }) => {
  await page.route("**/api/plans/*", async (route) => {
    if (route.request().method() !== "PUT") return route.continue()
    await route.fulfill({ status: 400, json: { detail: "Plan change rejected" } })
  })
  await page.goto("/plans")
  await page.locator("tbody tr").first().getByRole("button").first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Plan Name").fill("Preserved unsaved name")
  await dialog.getByRole("button", { name: "Save Changes" }).click()
  await expect(dialog.getByRole("alert")).toHaveText("Plan change rejected")
  await expect(dialog.getByLabel("Plan Name")).toHaveValue("Preserved unsaved name")
  await expect(dialog.getByRole("button", { name: "Save Changes" })).toBeEnabled()
})

test("dashboard handles a chart endpoint failure without crashing", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/api/dashboard/revenue-by-plan", (route) =>
    route.fulfill({ status: 500, json: { detail: "Unavailable" } })
  )
  await page.goto("/dashboard")
  await expect(page.getByText("Failed to fetch stats")).toBeVisible()
  expect(errors).toEqual([])
})

for (const path of ["usage", "tickets"]) {
  test(`${path} resumes scrolling after a failed page and retry`, async ({ page }) => {
    let failures = 1
    const pages: number[] = []
    await page.route(`**/api/${path}?*`, async (route) => {
      const number = Number(new URL(route.request().url()).searchParams.get("page"))
      pages.push(number)
      if (number === 1 && failures-- > 0) {
        return route.fulfill({ status: 500, json: { detail: "Temporary read failure" } })
      }
      const content = Array.from({ length: 50 }, (_, index) => ({
        id: number * 50 + index + 1,
        customer_id: 1,
        customer_name: "Test Customer",
        subject: `Question ${number * 50 + index + 1}`,
        priority: "LOW",
        status: "OPEN",
        created_at: "2025-01-01T00:00:00Z",
        resolved_at: null,
        type: "DATA",
        quantity: 1,
        cost: 1,
        recorded_at: "2025-01-01T00:00:00Z",
      }))
      return route.fulfill({ json: { content, hasNext: number < 2, totalElements: 150 } })
    })
    await page.goto(`/${path}`)
    await expect(page.locator("tbody tr")).toHaveCount(50)
    const scroll = () =>
      page.locator("div.h-full.overflow-auto").evaluate((node) => {
        node.scrollTop = node.scrollHeight
        node.dispatchEvent(new Event("scroll"))
      })
    await scroll()
    await expect(
      page.getByRole("alert").filter({ hasText: "Temporary read failure" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Retry" }).click()
    await expect(page.locator("tbody tr")).toHaveCount(100)
    await scroll()
    await expect(page.locator("tbody tr")).toHaveCount(150)
    // Development Strict Mode may start and abort one extra first-page request.
    const firstNext = pages.indexOf(1)
    expect(pages.slice(0, firstNext).every((number) => number === 0)).toBe(true)
    expect(pages.slice(firstNext)).toEqual([1, 1, 2])
    const ids = await page.locator("tbody tr td:first-child").allTextContents()
    expect(new Set(ids).size).toBe(150)
  })
}
