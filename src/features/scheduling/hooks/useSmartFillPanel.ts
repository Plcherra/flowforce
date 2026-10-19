"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "flowforce.schedule.smartFillOpen";
const PHONE_MEDIA = "(max-width: 767px)";
const INLINE_MEDIA = "(min-width: 1024px)";

function storageKey(userId: string | null | undefined) {
  return `${STORAGE_PREFIX}:${userId || "anonymous"}`;
}

function readOpen(
  userId: string | null | undefined,
  isPhone: boolean,
  canInline: boolean,
) {
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    // Storage can be blocked. Fall through to the width default.
  }
  // Phone and tablet keep the week grid full width until the user opens Smart Fill.
  // A side column only fits once the viewport can hold the app sidebar and the panel.
  if (isPhone || !canInline) return false;
  return true;
}

function writeOpen(userId: string | null | undefined, open: boolean) {
  try {
    window.localStorage.setItem(storageKey(userId), open ? "1" : "0");
  } catch {
    // Ignore private-mode and quota failures. The in-memory toggle still works.
  }
}

export function useSmartFillPanel(userId: string | null | undefined) {
  const [open, setOpenState] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [canInline, setCanInline] = useState(false);

  useEffect(() => {
    const phoneMedia = window.matchMedia(PHONE_MEDIA);
    const inlineMedia = window.matchMedia(INLINE_MEDIA);
    const sync = () => {
      const phone = phoneMedia.matches;
      const inline = inlineMedia.matches;
      setIsPhone(phone);
      setCanInline(inline);
      setOpenState(readOpen(userId, phone, inline));
    };
    sync();
    phoneMedia.addEventListener("change", sync);
    inlineMedia.addEventListener("change", sync);
    return () => {
      phoneMedia.removeEventListener("change", sync);
      inlineMedia.removeEventListener("change", sync);
    };
  }, [userId]);

  const setOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      setOpenState((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        writeOpen(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, [setOpen]);

  return {
    open,
    setOpen,
    toggle,
    isPhone,
    canInline,
    inline: open && canInline,
  };
}
