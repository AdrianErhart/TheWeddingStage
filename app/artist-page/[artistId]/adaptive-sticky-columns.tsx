/**
 * Baustein der Kuenstlerdetailseite.
 * Diese Datei unterstuetzt die Darstellung von Profilinformationen, Medien und nutzerbezogenen Aktionen innerhalb der Artist-Detailansicht.
 */
"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type AdaptiveStickyColumnsProps = {
  left: ReactNode;
  right: ReactNode;
};

export function AdaptiveStickyColumns({ left, right }: AdaptiveStickyColumnsProps) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLElement | null>(null);
  const [stickySide, setStickySide] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const updateStickySide = () => {
      if (window.innerWidth < 1280) {
        setStickySide(null);
        return;
      }

      const leftHeight = leftRef.current?.getBoundingClientRect().height ?? 0;
      const rightHeight = rightRef.current?.getBoundingClientRect().height ?? 0;

      if (leftHeight <= 0 || rightHeight <= 0) {
        setStickySide(null);
        return;
      }

      setStickySide(leftHeight <= rightHeight ? "left" : "right");
    };

    const observer = new ResizeObserver(updateStickySide);

    if (leftRef.current) {
      observer.observe(leftRef.current);
    }

    if (rightRef.current) {
      observer.observe(rightRef.current);
    }

    const rafId = window.requestAnimationFrame(updateStickySide);
    window.addEventListener("resize", updateStickySide);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", updateStickySide);
    };
  }, []);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <div
        ref={leftRef}
        className={stickySide === "left" ? "xl:sticky xl:top-24 xl:self-start" : undefined}
      >
        {left}
      </div>

      <aside
        ref={rightRef}
        className={stickySide === "right" ? "xl:sticky xl:top-24 xl:self-start" : undefined}
      >
        {right}
      </aside>
    </div>
  );
}
