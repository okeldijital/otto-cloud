"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  active: boolean;
  children: ReactNode;
  className?: string;
  onChange?: (active: boolean) => void;
}

/**
 * Fullscreen wrapper — preserves children (page/zoom state lives in parent).
 */
export default function PDFFullscreen({
  active,
  children,
  className,
  onChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onFsChange = () => {
      const isFs = document.fullscreenElement === el;
      onChange?.(isFs);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = async () => {
      try {
        if (active && document.fullscreenElement !== el) {
          await el.requestFullscreen();
        } else if (!active && document.fullscreenElement === el) {
          await document.exitFullscreen();
        }
      } catch {
        // Fullscreen may be blocked by browser policy — ignore.
      }
    };
    void run();
  }, [active]);

  return (
    <div
      ref={ref}
      className={className}
      data-fullscreen={active ? "true" : "false"}
    >
      {children}
    </div>
  );
}
