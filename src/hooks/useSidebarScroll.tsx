import { useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

const SCROLL_STORAGE_KEY = "sidebar-scroll-position";
const DEBOUNCE_DELAY = 150;

export function useSidebarScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const previousPathRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);

  // Debounced scroll position saver
  const saveScrollPosition = useCallback(() => {
    if (isRestoringRef.current) return; // Don't save during restoration

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        sessionStorage.setItem(SCROLL_STORAGE_KEY, scrollTop.toString());
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Restore scroll position with better timing
  const restoreScrollPosition = useCallback(() => {
    const savedScrollTop = sessionStorage.getItem(SCROLL_STORAGE_KEY);

    if (savedScrollTop && scrollContainerRef.current) {
      isRestoringRef.current = true;

      // Use requestAnimationFrame for smoother restoration
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseInt(savedScrollTop, 10);

          // Reset flag after restoration
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        }
      });
    }
  }, []);

  // Enhanced scroll to active item with better logic
  const scrollToActiveItem = useCallback(() => {
    if (!scrollContainerRef.current || isRestoringRef.current) return;

    // Wait for DOM updates
    setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const activeItem = scrollContainerRef.current.querySelector(
        '[data-active="true"]',
      );
      if (activeItem) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        // Check if item is not fully visible
        const isVisible =
          itemRect.top >= containerRect.top &&
          itemRect.bottom <= containerRect.bottom;

        if (!isVisible) {
          activeItem.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }, 50);
  }, []);

  // Handle scroll events with debouncing
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      saveScrollPosition();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveScrollPosition]);

  // Enhanced route change handling
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    if (previousPath && previousPath !== currentPath) {
      // Force save current position before navigation
      if (scrollContainerRef.current && !isRestoringRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        sessionStorage.setItem(SCROLL_STORAGE_KEY, scrollTop.toString());
      }

      // Restore scroll position after navigation with proper timing
      const restoreTimeout = setTimeout(() => {
        restoreScrollPosition();
      }, 150);

      // Scroll to active item after a longer delay
      const scrollTimeout = setTimeout(() => {
        scrollToActiveItem();
      }, 300);

      previousPathRef.current = currentPath;

      return () => {
        clearTimeout(restoreTimeout);
        clearTimeout(scrollTimeout);
      };
    } else if (!previousPath) {
      // Initial load - restore position
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);

      previousPathRef.current = currentPath;
    }
  }, [location.pathname, restoreScrollPosition, scrollToActiveItem]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Final save on unmount
      if (scrollContainerRef.current && !isRestoringRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        sessionStorage.setItem(SCROLL_STORAGE_KEY, scrollTop.toString());
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollContainerRef,
    scrollToActiveItem,
    saveScrollPosition,
    restoreScrollPosition,
  };
}
