import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useUsage, type UsageFilters } from "@/hooks/use-usage"
import { useTickets, type TicketFilters } from "@/hooks/use-tickets"

function page(id: number, hasNext = false, totalElements = 1) {
  return new Response(JSON.stringify({ content: [{ id }], hasNext, totalElements }))
}

function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("usage pagination", () => {
  it("ignores an older filter response finishing last", async () => {
    const old = deferred()
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(page(2)))
    const { result, rerender } = renderHook(({ filters }) => useUsage(filters), {
      initialProps: { filters: {} as UsageFilters },
    })
    rerender({ filters: { type: "DATA" } })
    await waitFor(() => expect(result.current.records).toEqual([{ id: 2 }]))
    await act(async () => old.resolve(page(1, true, 100)))
    expect(result.current.records).toEqual([{ id: 2 }])
    expect(result.current.totalElements).toBe(1)
    expect(result.current.hasNext).toBe(false)
  })

  it("ignores an old load-more response after filters change", async () => {
    const old = deferred()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(page(1, true, 100))
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce(page(3))
    )
    const { result, rerender } = renderHook(({ filters }) => useUsage(filters), {
      initialProps: { filters: {} as UsageFilters },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      void result.current.loadMore()
    })
    rerender({ filters: { type: "SMS" } })
    await waitFor(() => expect(result.current.records).toEqual([{ id: 3 }]))
    await act(async () => old.resolve(page(2)))
    expect(result.current.records).toEqual([{ id: 3 }])
  })

  it("serializes repeated load-more calls and retries the failed page", async () => {
    const next = deferred()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(page(1, true, 100))
        .mockReturnValueOnce(next.promise)
        .mockResolvedValueOnce(page(2))
    )
    const { result } = renderHook(() => useUsage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      void result.current.loadMore()
      void result.current.loadMore()
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    await act(async () => next.resolve(new Response("", { status: 500 })))
    await act(async () => {
      await result.current.retry()
    })
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(urls[1]).toContain("page=1")
    expect(urls[2]).toContain("page=1")
    expect(result.current.records).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.current.error).toBeNull()
  })
})

describe("ticket pagination", () => {
  it("retries the initial page after a read failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("", { status: 500 }))
        .mockResolvedValueOnce(page(1))
    )
    const { result } = renderHook(() => useTickets())
    await waitFor(() => expect(result.current.error).toBe("Failed to fetch tickets"))
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.tickets).toEqual([{ id: 1 }])
    expect(result.current.error).toBeNull()
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("page=0")
  })
  it("ignores superseded ticket filters", async () => {
    const old = deferred()
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(page(2)))
    const { result, rerender } = renderHook(({ filters }) => useTickets(filters), {
      initialProps: { filters: {} as TicketFilters },
    })
    rerender({ filters: { status: "OPEN" } })
    await waitFor(() => expect(result.current.tickets).toEqual([{ id: 2 }]))
    await act(async () => old.resolve(page(1)))
    expect(result.current.tickets).toEqual([{ id: 2 }])
  })

  it.each(["create", "update", "delete"] as const)(
    "resets rows, totals, and offsets after %s",
    async (method) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(page(1, true, 100))
          .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, status: "RESOLVED" })))
          .mockResolvedValueOnce(page(2, true, 99))
          .mockResolvedValueOnce(page(3, false, 99))
      )
      const { result } = renderHook(() => useTickets({ status: "OPEN" }))
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        if (method === "create")
          await result.current.createTicket({ customerId: 1, subject: "Test", priority: "LOW" })
        if (method === "update")
          await result.current.updateTicket(1, { subject: "Test", status: "RESOLVED" })
        if (method === "delete") await result.current.deleteTicket(1)
      })
      expect(result.current.tickets).toEqual([{ id: 2 }])
      expect(result.current.totalElements).toBe(99)
      expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain("page=0")
      await act(async () => {
        await result.current.loadMore()
      })
      expect(String(vi.mocked(fetch).mock.calls[3][0])).toContain("page=1")
      expect(result.current.tickets).toEqual([{ id: 2 }, { id: 3 }])
    }
  )

  it("refreshes the latest filters when a mutation started under older filters", async () => {
    const mutation = deferred()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(page(1))
        .mockReturnValueOnce(mutation.promise)
        .mockResolvedValueOnce(page(2))
        .mockResolvedValueOnce(page(3))
    )
    const { result, rerender } = renderHook(({ filters }) => useTickets(filters), {
      initialProps: { filters: { status: "OPEN" } as TicketFilters },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let updating!: Promise<unknown>
    act(() => {
      updating = result.current.updateTicket(1, { subject: "Edited" })
    })
    rerender({ filters: { status: "CLOSED" } })
    await waitFor(() => expect(result.current.tickets).toEqual([{ id: 2 }]))
    await act(async () => {
      mutation.resolve(new Response('{"id":1}'))
      await updating
    })
    expect(String(vi.mocked(fetch).mock.calls[3][0])).toContain("status=CLOSED")
    expect(result.current.tickets).toEqual([{ id: 3 }])
  })
})
