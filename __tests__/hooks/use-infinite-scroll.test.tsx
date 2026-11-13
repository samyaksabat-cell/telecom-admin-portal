import { useRef } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

afterEach(cleanup)

it("attaches to the replacement scroll element after loading with unchanged options", () => {
  const loadMore = vi.fn()
  function Harness({ loading }: { loading: boolean }) {
    const scrollRef = useRef<HTMLDivElement>(null)
    useInfiniteScroll({ scrollRef, loadMore, hasNext: true, loading: false })
    return loading ? <p>Loading</p> : <div ref={scrollRef} data-testid="scroll" />
  }
  const { rerender } = render(<Harness loading={false} />)
  const old = screen.getByTestId("scroll")
  fireEvent.scroll(old)
  expect(loadMore).toHaveBeenCalledTimes(1)
  rerender(<Harness loading />)
  rerender(<Harness loading={false} />)
  fireEvent.scroll(screen.getByTestId("scroll"))
  expect(loadMore).toHaveBeenCalledTimes(2)
  fireEvent.scroll(old)
  expect(loadMore).toHaveBeenCalledTimes(2)
})
