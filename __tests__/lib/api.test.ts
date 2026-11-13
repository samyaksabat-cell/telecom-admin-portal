import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchCollection, requireOk } from "@/lib/api"

afterEach(() => vi.unstubAllGlobals())

describe("API responses", () => {
  it("keeps the server's conflict explanation", async () => {
    await expect(
      requireOk(
        new Response(JSON.stringify({ detail: "Move customers before deleting" }), { status: 409 }),
        "Delete failed"
      )
    ).rejects.toThrow("Move customers before deleting")
  })

  it.each(["", "not json", "null", '{"detail":123}'])(
    "falls back for error body %s",
    async (body) => {
      await expect(requireOk(new Response(body, { status: 400 }), "Save failed")).rejects.toThrow(
        "Save failed"
      )
    }
  )

  it("retrieves every collection page", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1 }]), { headers: { "X-Has-Next": "true" } })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 2 }]), { headers: { "X-Has-Next": "false" } })
        )
    )
    expect(await fetchCollection("/api/plans", "Read failed")).toEqual([{ id: 1 }, { id: 2 }])
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/plans")
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/plans?page=1")
  })

  it("does not return a silently truncated collection when a later page fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("[]", { headers: { "X-Has-Next": "true" } }))
        .mockResolvedValueOnce(new Response("", { status: 500 }))
    )
    await expect(fetchCollection("/api/customers", "Read failed")).rejects.toThrow("Read failed")
  })
})
