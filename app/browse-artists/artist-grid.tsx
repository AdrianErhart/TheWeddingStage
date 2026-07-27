/**
 * Feature-Modul fuer die Kuenstlersuche und -liste.
 * Enthaelt Logik fuer Filter, URL-/Local-Storage-Synchronisation und die Darstellung von Ergebnissen inklusive Interaktionen.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { buildArtistPath } from "@/lib/artist-url";

type ArtistCardData = {
  id: string;
  artistName: string;
  profilePicture: string;
  genre: string[];
  bandSize: string;
  musicAccompaniment: string[];
  instruments: string[];
  location: string;
  radius: string;
  averageRating: number | null;
  reviewCount: number;
};

type ArtistGridProps = {
  initialArtists: ArtistCardData[];
  totalArtists: number;
  pageSize?: number;
  filters: {
    genre: string[];
    bandSize: string[];
    instrument: string[];
    accompaniment: string[];
    searchLocation: string;
    weddingDate: string;
  };
};

function TagPill({ label, title }: { label: string; title?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border border-black/18 bg-black/[0.03] px-2.5 py-1 text-[0.7rem] font-medium leading-none text-black/80"
      title={title ?? label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function OverflowTagLine({
  label,
  items,
  lineKey,
}: {
  label: string;
  items: string[];
  lineKey: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const itemMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const moreMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const itemWidths = items.map((_, index) => itemMeasureRefs.current[index]?.getBoundingClientRect().width ?? 0);
      const gapWidth = 8;
      const labelWidth = labelRef.current?.getBoundingClientRect().width ?? 0;
      const availableWidth = Math.max(container.getBoundingClientRect().width - labelWidth - gapWidth, 0);
      const fitTolerance = 0.5;

      let nextVisibleCount = 0;
      for (let visible = items.length; visible >= 0; visible -= 1) {
        const hidden = items.length - visible;
        const visibleWidth = itemWidths.slice(0, visible).reduce((sum, width) => sum + width, 0);
        const visibleGaps = Math.max(visible - 1, 0) * gapWidth;
        const moreWidth = hidden > 0 ? (moreMeasureRefs.current[hidden - 1]?.getBoundingClientRect().width ?? 0) : 0;
        const moreGap = hidden > 0 && visible > 0 ? gapWidth : 0;
        const totalNeededWidth = visibleWidth + visibleGaps + moreGap + moreWidth;

        if (totalNeededWidth <= availableWidth + fitTolerance) {
          nextVisibleCount = visible;
          break;
        }
      }

      setVisibleCount(nextVisibleCount);
    };

    const observer = new ResizeObserver(recalc);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    recalc();

    window.addEventListener("resize", recalc);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [items]);

  const hiddenCount = Math.max(items.length - visibleCount, 0);

  useEffect(() => {
    const popover = popoverRef.current;

    if (!popover) {
      return;
    }

    if (!popoverOpen) {
      popover.style.transform = "";
      return;
    }

    const updateShift = () => {
      const boundary = containerRef.current;

      if (!boundary) {
        popover.style.transform = "";
        return;
      }

      const popoverRect = popover.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      let nextShift = 0;

      if (popoverRect.left < boundaryRect.left) {
        nextShift += boundaryRect.left - popoverRect.left;
      }

      if (popoverRect.right + nextShift > boundaryRect.right) {
        nextShift -= popoverRect.right + nextShift - boundaryRect.right;
      }

      popover.style.transform = nextShift === 0 ? "" : `translateX(${Math.round(nextShift)}px)`;
    };

    const rafId = window.requestAnimationFrame(updateShift);
    window.addEventListener("resize", updateShift);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateShift);
    };
  }, [hiddenCount, popoverOpen]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-7 items-center gap-2 overflow-visible whitespace-nowrap"
      onMouseLeave={() => setPopoverOpen(false)}
    >
      <span ref={labelRef} className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-black/45">
        {label}
      </span>

      {items.slice(0, visibleCount).map((item, index) => (
        <TagPill key={`${lineKey}-${item}-${index}`} label={item} />
      ))}

      {hiddenCount > 0 ? (
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setPopoverOpen(true)}
            onFocus={() => setPopoverOpen(true)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPopoverOpen((current) => !current);
            }}
            className="inline-flex h-auto shrink-0 items-center rounded-full border border-black/25 bg-black/8 px-2.5 py-1 text-[0.7rem] font-semibold leading-none text-black"
            aria-expanded={popoverOpen}
            aria-label={`${hiddenCount} weitere Einträge anzeigen`}
            title={items.join(", ")}
          >
            +{hiddenCount}
          </button>

          {popoverOpen ? (
            <div
              ref={popoverRef}
              className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-[14.5rem] rounded-xl border border-black/15 bg-white p-2 shadow-lg shadow-black/15"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <div className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-black/55">{label}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, index) => (
                  <TagPill key={`${lineKey}-all-${item}-${index}`} label={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-none absolute -left-[9999px] -top-[9999px] flex gap-2 opacity-0">
        {items.map((item, index) => (
          <span
            key={`${lineKey}-measure-${item}-${index}`}
            ref={(element) => {
              itemMeasureRefs.current[index] = element;
            }}
            className="inline-flex shrink-0 items-center rounded-full border border-black/18 bg-black/[0.03] px-2.5 py-1 text-[0.7rem] font-medium leading-none text-black/80"
          >
            {item}
          </span>
        ))}
        {items.map((_, index) => (
          <span
            key={`${lineKey}-measure-more-${index}`}
            ref={(element) => {
              moreMeasureRefs.current[index] = element;
            }}
            className="inline-flex shrink-0 items-center rounded-full border border-black/25 bg-black/8 px-2.5 py-1 text-[0.7rem] font-semibold leading-none text-black"
          >
            +{index + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArtistCard({ artist, nameMinHeight }: { artist: ArtistCardData; nameMinHeight?: number }) {
  const cityName = artist.location.split(",")[0].trim();
  const locationWithRadius = [cityName, artist.radius ? `(${artist.radius})` : ""]
    .filter((entry) => entry.trim().length > 0)
    .join(" ");
  const missingValueLabel = "Keine Angabe";

  const previewTags = {
    bandSize: artist.bandSize ? [artist.bandSize] : [missingValueLabel],
    genre: artist.genre.length > 0 ? artist.genre : [missingValueLabel],
    instruments: artist.instruments.length > 0 ? artist.instruments : [missingValueLabel],
    musicAccompaniment: artist.musicAccompaniment.length > 0 ? artist.musicAccompaniment : [missingValueLabel],
    location: locationWithRadius ? [locationWithRadius] : [missingValueLabel],
  };

  const averageRatingLabel = artist.averageRating !== null ? artist.averageRating.toFixed(1) : null;
  const hasReviews = averageRatingLabel !== null && artist.reviewCount > 0;
  const reviewCountLabel = `${artist.reviewCount} Rezension${artist.reviewCount === 1 ? "" : "en"}`;

  return (
    <Link
      href={`${buildArtistPath(artist.id, artist.artistName)}?from=browse`}
      onClick={() => {
        try {
          const currentUrl = `${window.location.pathname}${window.location.search}`;
          window.sessionStorage.setItem(
            "browse-artists:last-scroll",
            JSON.stringify({ url: currentUrl, scrollY: Math.max(0, Math.round(window.scrollY)) })
          );
        } catch {
          // Best-effort only.
        }
      }}
      className="group block h-full overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-black">
          {artist.profilePicture ? (
            <Image
              src={artist.profilePicture}
              alt={artist.artistName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60" />
          )}
        </div>

        <div className="flex flex-1 flex-col px-6 pt-3 pb-5 text-black">
          <div className="mb-3 flex items-center justify-center" style={nameMinHeight ? { minHeight: `${nameMinHeight}px` } : undefined}>
            <h3 data-artist-name className="text-center text-2xl font-semibold leading-tight">{artist.artistName}</h3>
          </div>

          <div className="h-px w-full bg-black/12" />

          <div className="mt-auto w-full">
            <p className="mb-3 mt-3 min-h-5 text-center text-sm font-medium">
              {hasReviews ? (
                <>
                  <span className="text-black/85">{averageRatingLabel} / 5</span>{" "}
                  <span className="text-black/55">({reviewCountLabel})</span>
                </>
              ) : (
                <span className="text-black/55">(0 Rezensionen)</span>
              )}
            </p>

            <div className="space-y-1.5 text-left" style={{ minHeight: `${5 * 1.9}rem` }}>
              <OverflowTagLine label="Band" items={previewTags.bandSize} lineKey="band-size" />
              <OverflowTagLine label="Genre" items={previewTags.genre} lineKey="genre" />
              <OverflowTagLine label="Instrumente" items={previewTags.instruments} lineKey="instruments" />
              <OverflowTagLine label="Rahmen" items={previewTags.musicAccompaniment} lineKey="music-accompaniment" />
              <OverflowTagLine label="Ort" items={previewTags.location} lineKey="location" />
            </div>
          </div>
        </div>

        <div className="mt-auto px-4 pb-4">
          <div className="flex h-14 items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white transition group-hover:bg-black/85">
            Details
          </div>
        </div>
      </article>
    </Link>
  );
}

export function ArtistGrid({ initialArtists, totalArtists, pageSize = 20, filters }: ArtistGridProps) {
  const [artists, setArtists] = useState(initialArtists);
  const [isLoading, setIsLoading] = useState(false);
  const [reachedServerEnd, setReachedServerEnd] = useState(false);
  const [nameMinHeight, setNameMinHeight] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const hasMore = !reachedServerEnd && artists.length < totalArtists;

  useEffect(() => {
    const recalcNameMinHeight = () => {
      const grid = gridRef.current;

      if (!grid) {
        return;
      }

      const nameElements = Array.from(grid.querySelectorAll<HTMLElement>("[data-artist-name]"));

      if (nameElements.length === 0) {
        setNameMinHeight(0);
        return;
      }

      const maxHeight = nameElements.reduce((largest, element) => {
        return Math.max(largest, element.getBoundingClientRect().height);
      }, 0);

      setNameMinHeight(Math.ceil(maxHeight));
    };

    const grid = gridRef.current;
    const nameElements = grid ? Array.from(grid.querySelectorAll<HTMLElement>("[data-artist-name]")) : [];
    const observer = new ResizeObserver(recalcNameMinHeight);

    if (grid) {
      observer.observe(grid);
    }

    for (const element of nameElements) {
      observer.observe(element);
    }

    recalcNameMinHeight();
    window.addEventListener("resize", recalcNameMinHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalcNameMinHeight);
    };
  }, [artists]);

  const loadMore = async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        skip: String(artists.length),
        limit: String(pageSize),
      });

      if (filters.genre.length > 0) {
        query.set("genre", filters.genre.join(","));
      }

      if (filters.bandSize.length > 0) {
        query.set("bandSize", filters.bandSize.join(","));
      }

      if (filters.instrument.length > 0) {
        query.set("instrument", filters.instrument.join(","));
      }

      if (filters.accompaniment.length > 0) {
        query.set("accompaniment", filters.accompaniment.join(","));
      }

      if (filters.searchLocation) {
        query.set("searchLocation", filters.searchLocation);
      }

      if (filters.weddingDate) {
        query.set("weddingDate", filters.weddingDate);
      }

      const response = await fetch(`/api/artists?${query.toString()}`);
      const payload = (await response.json()) as {
        ok: boolean;
        artists?: ArtistCardData[];
      };

      if (!response.ok || !payload.ok || !Array.isArray(payload.artists)) {
        return;
      }

      const nextArtists = payload.artists ?? [];
      setArtists((current) => {
        const existingIds = new Set(current.map((artist) => artist.id));
        const uniqueNextArtists = nextArtists.filter((artist) => !existingIds.has(artist.id));

        if (uniqueNextArtists.length === 0) {
          setReachedServerEnd(true);
          return current;
        }

        return [...current, ...uniqueNextArtists];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div ref={gridRef} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} nameMinHeight={nameMinHeight} />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            disabled={isLoading}
            className="h-14 cursor-pointer rounded-full bg-black px-12 text-xl font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Lade..." : "Lade weitere Künstler..."}
          </button>
        </div>
      ) : null}
    </>
  );
}
