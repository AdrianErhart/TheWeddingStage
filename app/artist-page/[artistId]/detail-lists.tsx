/**
 * Baustein der Kuenstlerdetailseite.
 * Diese Datei unterstuetzt die Darstellung von Profilinformationen, Medien und nutzerbezogenen Aktionen innerhalb der Artist-Detailansicht.
 */
"use client";

import { useMemo, useState } from "react";

type ReviewItem = {
  id: string;
  title: string;
  stars: number | null;
  customerName: string;
  description: string;
  dateLabel: string;
};

type ReviewsListProps = {
  reviews: ReviewItem[];
  batchSize?: number;
};

type RepertoireListProps = {
  songs: string[];
  batchSize?: number;
};

export function ReviewsList({ reviews, batchSize = 5 }: ReviewsListProps) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount]);
  const hasMore = visibleCount < reviews.length;

  if (reviews.length === 0) {
    return <p>Noch keine Rezensionen für diesen Künstler.</p>;
  }

  return (
    <>
      {visibleReviews.map((review) => (
        <article key={review.id} className="rounded-[22px] border border-black/10 bg-black/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-semibold text-black">{review.title}</h3>
            <span className="shrink-0 text-sm font-medium text-black/65">{review.stars !== null ? `${review.stars}/5` : "-"}</span>
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-black/45">{review.customerName}</p>
          <p className="mt-3 text-black/75">{review.description}</p>
          <p className="mt-3 text-xs text-black/45">{review.dateLabel}</p>
        </article>
      ))}

      {hasMore ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + batchSize)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-black bg-white px-4 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            Weitere Rezensionen laden
          </button>
        </div>
      ) : null}
    </>
  );
}

export function RepertoireList({ songs, batchSize = 50 }: RepertoireListProps) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const visibleSongs = useMemo(() => songs.slice(0, visibleCount), [songs, visibleCount]);
  const hasMore = visibleCount < songs.length;

  if (songs.length === 0) {
    return <p>Noch keine Songs hinterlegt.</p>;
  }

  return (
    <>
      {visibleSongs.map((song, index) => (
        <p key={`${song}-${index}`}>{song}</p>
      ))}

      {hasMore ? (
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + batchSize)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-black bg-white px-4 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            Weitere Songs laden
          </button>
        </div>
      ) : null}
    </>
  );
}
