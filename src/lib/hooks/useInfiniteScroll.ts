/**
 * Infinite Scroll Hook
 * Uses IntersectionObserver to detect when user scrolls near the bottom
 */
import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Whether more items are available */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Root margin for intersection observer (default: 200px) */
  rootMargin?: string;
  /** Threshold for intersection (default: 0) */
  threshold?: number;
}

/**
 * Hook that returns a ref to attach to a sentinel element.
 * When the sentinel becomes visible, onLoadMore is called.
 *
 * Uses refs for callback/state values so the IntersectionObserver
 * is only created once (not torn down on every isLoading toggle).
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "200px",
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef({ onLoadMore, hasMore, isLoading });

  // Keep refs in sync with latest values (no re-renders, no observer churn)
  callbackRef.current = { onLoadMore, hasMore, isLoading };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const { onLoadMore, hasMore, isLoading } = callbackRef.current;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return sentinelRef;
}
