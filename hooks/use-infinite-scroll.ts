"use client"

import { useCallback, useEffect, RefObject } from "react"

interface UseInfiniteScrollOptions {
  scrollRef: RefObject<HTMLElement | null>
  loadMore: () => void
  hasNext: boolean
  loading: boolean
  threshold?: number
}

export function useInfiniteScroll({
  scrollRef,
  loadMore,
  hasNext,
  loading,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || loading || !hasNext) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore()
    }
  }, [scrollRef, loadMore, loading, hasNext, threshold])

  useEffect(() => {
    // A loading/error view can replace the DOM node without changing the ref.
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  })
}
