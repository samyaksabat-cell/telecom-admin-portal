import { test, expect, type APIRequestContext } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

interface ApiCustomer {
  status: string
  plan_id: number | null
  plan_name: string | null
}

interface ApiPlan {
  id: number
  name: string
  monthly_price: number
}

async function collection<T>(request: APIRequestContext, path: string): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; ; page += 1) {
    const response = await request.get(`${backendUrl}${path}?page=${page}`)
    expect(response.ok()).toBeTruthy()
    rows.push(...(await response.json()))
    if (response.headers()["x-has-next"] !== "true") return rows
  }
}

// The oracle joins by immutable IDs, not plan names, and includes all pages.
test.describe("Dashboard revenue aggregates", () => {
  test("monthly revenue counts only active subscribers", async ({ request }) => {
    const [statsRes, customers, plans] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/stats`),
      collection<ApiCustomer>(request, "/api/customers"),
      collection<ApiPlan>(request, "/api/plans"),
    ])
    expect(statsRes.ok()).toBeTruthy()
    const stats = await statsRes.json()
    const priceByPlan = new Map(plans.map((p) => [p.id, p.monthly_price]))
    const expected = customers
      .filter((c) => c.status === "ACTIVE" && c.plan_id !== null)
      .reduce((sum, c) => sum + (priceByPlan.get(c.plan_id!) ?? 0), 0)
    expect(Number(stats.monthly_revenue)).toBeCloseTo(expected, 2)
  })

  test("active customer count matches the customer list", async ({ request }) => {
    const [statsRes, customers] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/stats`),
      collection<ApiCustomer>(request, "/api/customers"),
    ])
    expect(statsRes.ok()).toBeTruthy()
    const stats = await statsRes.json()
    expect(stats.active_customers).toBe(customers.filter((c) => c.status === "ACTIVE").length)
  })

  test("revenue by plan matches every active plan ID even with duplicate names", async ({
    request,
  }) => {
    const [revenueRes, customers, plans] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/revenue-by-plan`),
      collection<ApiCustomer>(request, "/api/customers"),
      collection<ApiPlan>(request, "/api/plans"),
    ])
    expect(revenueRes.ok()).toBeTruthy()
    const revenue: { name: string; revenue: number }[] = await revenueRes.json()
    const expected = plans
      .filter((plan) => customers.some((c) => c.status === "ACTIVE" && c.plan_id === plan.id))
      .map((plan) => ({
        name: plan.name,
        revenue:
          plan.monthly_price *
          customers.filter((c) => c.status === "ACTIVE" && c.plan_id === plan.id).length,
      }))
    // Compare a multiset so duplicate names remain separate rows.
    const ordered = (rows: typeof revenue) =>
      rows.map((row) => `${row.name}:${Number(row.revenue).toFixed(2)}`).sort()
    expect(ordered(revenue)).toEqual(ordered(expected))
  })
})
