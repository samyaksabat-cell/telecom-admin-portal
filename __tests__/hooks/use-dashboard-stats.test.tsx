import { renderHook, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"

const stats = {
  active_customers: 3,
  monthly_revenue: 80,
  open_tickets: 5,
  devices_in_use: 7,
}

const payloads: Record<string, unknown> = {
  "/api/dashboard/stats": stats,
  "/api/dashboard/customers-by-plan": [{ name: "Basic", value: 2 }],
  "/api/dashboard/devices-by-status": [{ name: "ASSIGNED", value: 7 }],
  "/api/dashboard/tickets-by-status": [{ name: "OPEN", value: 5 }],
  "/api/dashboard/revenue-by-plan": [{ name: "Basic", revenue: 40 }],
}

function stubFetch(overrides: { failStats?: boolean } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const ok = !(overrides.failStats && url === "/api/dashboard/stats")
      return { ok, json: async () => payloads[url] } as Response
    })
  )
}

describe("useDashboardStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fetches every dashboard endpoint once", async () => {
    stubFetch()
    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(5)
    Object.keys(payloads).forEach((url) => expect(fetch).toHaveBeenCalledWith(url))
  })

  it("populates every slice of dashboard state", async () => {
    stubFetch()
    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual(stats)
    expect(result.current.customersByPlan).toEqual([{ name: "Basic", value: 2 }])
    expect(result.current.devicesByStatus).toEqual([{ name: "ASSIGNED", value: 7 }])
    expect(result.current.ticketsByStatus).toEqual([{ name: "OPEN", value: 5 }])
    expect(result.current.revenueByPlan).toEqual([{ name: "Basic", revenue: 40 }])
    expect(result.current.error).toBeNull()
  })

  it("reports an error and leaves stats null when the stats call fails", async () => {
    stubFetch({ failStats: true })
    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe("Failed to fetch stats")
    expect(result.current.stats).toBeNull()
  })

  it("refetches on demand", async () => {
    stubFetch()
    const { result } = renderHook(() => useDashboardStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.fetchStats()
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(10)
  })

  it.each(Object.keys(payloads).filter((url) => url !== "/api/dashboard/stats"))(
    "handles a failed chart endpoint without storing its JSON object: %s",
    async (failedUrl) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => ({
          ok: url !== failedUrl,
          json: async () => (url === failedUrl ? { detail: "Unavailable" } : payloads[url]),
        }))
      )
      const { result } = renderHook(() => useDashboardStats())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.error).toBe("Failed to fetch stats")
      expect(result.current.customersByPlan).toEqual([])
      expect(result.current.devicesByStatus).toEqual([])
      expect(result.current.ticketsByStatus).toEqual([])
      expect(result.current.revenueByPlan).toEqual([])
    }
  )
})
