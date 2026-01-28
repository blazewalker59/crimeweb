/**
 * Infinite Scroll Hook
 * Uses IntersectionObserver to detect when user scrolls near the bottom
 */
import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  /** Callback to load more items */
  onLoadMore: () => void
  /** Whether more items are available */
  hasMore: boolean
  /** Whether currently loading */
  isLoading: boolean
  /** Root margin for intersection observer (default: 200px) */
  rootMargin?: string
  /** Threshold for intersection (default: 0) */
  threshold?: number
}

/**
 * Hook that returns a ref to attach to a sentinel element.
 * When the sentinel becomes visible, onLoadMore is called.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '200px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [onLoadMore, hasMore, isLoading]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    })

    observerRef.current.observe(sentinel)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersection, rootMargin, threshold])

  return sentinelRef
}
