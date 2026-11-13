"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { requireOk } from "@/lib/api"

interface Page<T> {
  content: T[]
  hasNext: boolean
  totalElements: number
}

export function usePagedRecords<T>(url: string, failureMessage: string) {
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const urlRef = useRef(url)
  const generation = useRef(0)
  const currentPage = useRef(0)
  const busy = useRef(false)
  const moreAvailable = useRef(false)
  const active = useRef(false)
  const request = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!active.current || (!reset && (busy.current || !moreAvailable.current))) return
      if (reset) {
        generation.current += 1
        request.current?.abort()
        moreAvailable.current = false
        setLoading(true)
        setLoadingMore(false)
        setHasNext(false)
        setError(null)
      } else {
        setLoadingMore(true)
      }
      const token = generation.current
      const page = reset ? 0 : currentPage.current + 1
      const controller = new AbortController()
      request.current = controller
      busy.current = true
      const [path, query] = urlRef.current.split("?")
      const params = new URLSearchParams(query)
      params.set("page", String(page))
      params.set("size", "50")
      try {
        const response = await fetch(`${path}?${params}`, { signal: controller.signal })
        await requireOk(response, failureMessage)
        const data: Page<T> = await response.json()
        if (token !== generation.current || !active.current) return
        // Commit the page only after success, so retries cannot skip a page.
        currentPage.current = page
        moreAvailable.current = data.hasNext
        setRecords((previous) =>
          reset ? (data.content ?? []) : [...previous, ...(data.content ?? [])]
        )
        setHasNext(data.hasNext)
        setTotalElements(data.totalElements)
        setError(null)
      } catch (failure) {
        if (token === generation.current && active.current && !controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : failureMessage)
        }
      } finally {
        if (token === generation.current && active.current) {
          busy.current = false
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [failureMessage]
  )

  const refresh = useCallback(() => fetchPage(true), [fetchPage])
  const loadMore = useCallback(() => fetchPage(false), [fetchPage])
  const retry = useCallback(() => fetchPage(!moreAvailable.current), [fetchPage])

  useEffect(() => {
    active.current = true
    urlRef.current = url
    void refresh()
    return () => {
      active.current = false
      generation.current += 1
      request.current?.abort()
      busy.current = false
    }
  }, [url, refresh])

  return { records, loading, loadingMore, error, hasNext, totalElements, refresh, loadMore, retry }
}
