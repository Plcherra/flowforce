import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import "@/styles/messages.css";

const DEFAULT_MIN_SIDEBAR = 240;
const DEFAULT_MIN_CONTENT = 320;

type PointerKind = "mouse" | "touch" | null;

export interface MessagesLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
  minContentWidth?: number;
  dividerAriaLabel?: string;
  className?: string;
  sidebarId?: string;
  contentId?: string;
}

export function MessagesLayout({
  sidebar,
  content,
  sidebarWidth,
  onSidebarWidthChange,
  minSidebarWidth = DEFAULT_MIN_SIDEBAR,
  maxSidebarWidth,
  minContentWidth = DEFAULT_MIN_CONTENT,
  dividerAriaLabel = "Resize panel",
  className,
  sidebarId,
  contentId,
}: MessagesLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const moveListenerRef = useRef<EventListener | null>(null);
  const upListenerRef = useRef<EventListener | null>(null);
  const pointerKindRef = useRef<PointerKind>(null);
  const startWidthRef = useRef<number>(sidebarWidth);
  const maxWidthRef = useRef<number>(sidebarWidth);

  const clamp = useCallback(
    (value: number) => {
      const min = minSidebarWidth;
      const max = maxWidthRef.current;
      if (!Number.isFinite(max)) {
        return Math.max(min, value);
      }
      return Math.min(Math.max(value, min), max);
    },
    [minSidebarWidth],
  );

  const computeEffectiveMaxWidth = useCallback(() => {
    const containerWidth =
      containerRef.current?.getBoundingClientRect().width ?? 0;
    const containerLimit =
      containerWidth > 0
        ? containerWidth - minContentWidth
        : Number.POSITIVE_INFINITY;
    const desiredMax = maxSidebarWidth ?? Number.POSITIVE_INFINITY;
    const boundedMax = Math.min(desiredMax, containerLimit);
    if (!Number.isFinite(boundedMax)) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(minSidebarWidth, boundedMax);
  }, [maxSidebarWidth, minContentWidth, minSidebarWidth]);

  const cleanupPointerListeners = useCallback(() => {
    const moveListener = moveListenerRef.current;
    const upListener = upListenerRef.current;
    const pointerKind = pointerKindRef.current;

    if (pointerKind === "mouse") {
      if (moveListener) window.removeEventListener("mousemove", moveListener);
      if (upListener) window.removeEventListener("mouseup", upListener);
    } else if (pointerKind === "touch") {
      if (moveListener) window.removeEventListener("touchmove", moveListener);
      if (upListener) {
        window.removeEventListener("touchend", upListener);
        window.removeEventListener("touchcancel", upListener);
      }
    }

    moveListenerRef.current = null;
    upListenerRef.current = null;
    pointerKindRef.current = null;
    document.body.classList.remove("flowforce-resizing");
  }, []);

  useEffect(
    () => () => {
      cleanupPointerListeners();
    },
    [cleanupPointerListeners],
  );

  useEffect(() => {
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const startResize = useCallback(
    (startX: number, kind: "mouse" | "touch") => {
      cleanupPointerListeners();

      pointerKindRef.current = kind;
      startWidthRef.current = sidebarWidth;
      maxWidthRef.current = computeEffectiveMaxWidth();
      document.body.classList.add("flowforce-resizing");
      window.getSelection()?.removeAllRanges();

      const handleMove: EventListener = (event) => {
        let clientX: number | undefined;
        const touchEvent = event as TouchEvent;
        if ("touches" in touchEvent && touchEvent.touches.length > 0) {
          clientX = touchEvent.touches[0]?.clientX;
          if (typeof touchEvent.preventDefault === "function") {
            touchEvent.preventDefault();
          }
        } else if ("clientX" in event) {
          clientX = (event as MouseEvent).clientX;
        }

        if (typeof clientX !== "number") return;
        const delta = clientX - startX;
        const next = clamp(startWidthRef.current + delta);
        onSidebarWidthChange(next);
      };

      const handleRelease: EventListener = () => {
        cleanupPointerListeners();
        dividerRef.current?.focus();
      };

      moveListenerRef.current = handleMove;
      upListenerRef.current = handleRelease;

      if (kind === "mouse") {
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleRelease);
      } else {
        window.addEventListener("touchmove", handleMove, { passive: false });
        window.addEventListener("touchend", handleRelease);
        window.addEventListener("touchcancel", handleRelease);
      }
    },
    [
      cleanupPointerListeners,
      clamp,
      onSidebarWidthChange,
      sidebarWidth,
      computeEffectiveMaxWidth,
    ],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      startResize(event.clientX, "mouse");
    },
    [startResize],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 0) return;
      const touch = event.touches[0];
      startResize(touch.clientX, "touch");
    },
    [startResize],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 40 : 16;
      const max = computeEffectiveMaxWidth();
      maxWidthRef.current = max;
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key === "ArrowLeft") {
        onSidebarWidthChange(clamp(sidebarWidth - step));
      } else if (event.key === "ArrowRight") {
        onSidebarWidthChange(clamp(sidebarWidth + step));
      } else if (event.key === "Home") {
        onSidebarWidthChange(minSidebarWidth);
      } else if (event.key === "End") {
        onSidebarWidthChange(Number.isFinite(max) ? max : sidebarWidth);
      }
    },
    [
      clamp,
      computeEffectiveMaxWidth,
      minSidebarWidth,
      onSidebarWidthChange,
      sidebarWidth,
    ],
  );

  const ariaProps = useMemo(() => {
    const max = computeEffectiveMaxWidth();
    const finiteMax = Number.isFinite(max) ? max : undefined;
    return {
      "aria-valuemin": minSidebarWidth,
      "aria-valuenow": Math.round(sidebarWidth),
      ...(finiteMax ? { "aria-valuemax": Math.round(finiteMax) } : {}),
    };
  }, [computeEffectiveMaxWidth, minSidebarWidth, sidebarWidth]);

  const handleDoubleClick = useCallback(() => {
    const max = computeEffectiveMaxWidth();
    const target = Math.min(
      Math.max(minSidebarWidth, 320),
      Number.isFinite(max) ? max : 480,
    );
    onSidebarWidthChange(target);
  }, [computeEffectiveMaxWidth, minSidebarWidth, onSidebarWidthChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "messages-layout flex h-full w-full overflow-hidden",
        className,
      )}
    >
      <aside
        id={sidebarId}
        className="messages-layout__sidebar flex h-full min-w-0 flex-col"
        style={{
          width: Math.max(minSidebarWidth, sidebarWidth),
          minWidth: minSidebarWidth,
        }}
      >
        {sidebar}
      </aside>
      <div
        ref={dividerRef}
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={dividerAriaLabel}
        aria-controls={sidebarId ?? undefined}
        {...ariaProps}
        className="messages-divider"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      />
      <main
        id={contentId}
        className="messages-layout__content flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        {content}
      </main>
    </div>
  );
}
