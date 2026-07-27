/**
 * Baustein der Kuenstlerdetailseite.
 * Diese Datei unterstuetzt die Darstellung von Profilinformationen, Medien und nutzerbezogenen Aktionen innerhalb der Artist-Detailansicht.
 */
"use client";

import Image from "next/image";
import { useRef, useState, useCallback } from "react";

type GalleryCarouselProps = {
  images: string[];
};

export function GalleryCarousel({ images }: GalleryCarouselProps) {
  const shown = images.slice(0, 3);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const item = container.children[index] as HTMLElement | undefined;
    if (!item) return;
    container.scrollTo({ left: item.offsetLeft, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.offsetWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(container.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setActiveIndex(closest);
  }, []);

  if (shown.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Galerie</h2>

      {/* Mobile carousel */}
      <div className="relative mt-6 md:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto gap-4 pb-1 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {shown.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-[28px] bg-black"
            >
              <Image
                src={image}
                alt={`Galeriebild ${index + 1}`}
                fill
                sizes="(max-width: 767px) 100vw, 0px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Arrow buttons – only visible when there are multiple images */}
        {shown.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Vorheriges Bild"
              onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Nächstes Bild"
              onClick={() => scrollTo(Math.min(shown.length - 1, activeIndex + 1))}
              disabled={activeIndex === shown.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="mt-4 flex justify-center gap-2">
              {shown.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Bild ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={`h-2 w-2 rounded-full transition ${i === activeIndex ? "bg-black" : "bg-black/25"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Desktop grid */}
      <div className="mt-6 hidden gap-6 md:grid md:grid-cols-3">
        {shown.map((image, index) => (
          <div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-[28px] bg-black">
            <Image
              src={image}
              alt={`Galeriebild ${index + 1}`}
              fill
              sizes="(min-width: 768px) 33vw, 0px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
