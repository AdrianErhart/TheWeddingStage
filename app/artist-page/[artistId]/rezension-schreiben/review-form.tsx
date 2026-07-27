/**
 * Baustein der Kuenstlerdetailseite.
 * Diese Datei unterstuetzt die Darstellung von Profilinformationen, Medien und nutzerbezogenen Aktionen innerhalb der Artist-Detailansicht.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  artistId: string;
  artistPath: string;
  customerId: string;
  customerName: string;
  artistName: string;
  initialReview?: {
    title: string;
    description: string;
    stars: number;
  };
};

const STAR_OPTIONS = ["5 Sterne", "4 Sterne", "3 Sterne", "2 Sterne", "1 Stern"];
const MAX_REVIEW_TITLE_LENGTH = 120;
const MAX_REVIEW_DESCRIPTION_LENGTH = 1200;

function SingleSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
  hasError = false,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (nextValue: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-14 w-full items-center justify-between rounded-full border bg-transparent px-6 text-lg text-black/35 outline-none transition hover:border-black ${
          hasError ? "border-red-500 focus:border-red-600" : "border-black/45"
        }`}
      >
        <span className={`truncate text-left ${value ? "text-black" : "text-black/35"}`}>
          {value || placeholder}
        </span>
        <span aria-hidden="true" className="pr-1">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10">
          <div className="max-h-64 space-y-1 overflow-auto text-left text-sm text-black/80">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-black/5 ${
                  value === option ? "bg-black/5 text-black" : ""
                }`}
              >
                <span>{option}</span>
                {value === option ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReviewForm({ artistId, artistPath, customerId, customerName, artistName, initialReview }: ReviewFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialReview?.title ?? "");
  const [description, setDescription] = useState(initialReview?.description ?? "");
  const [stars, setStars] = useState(
    initialReview?.stars ? `${initialReview.stars} Stern${initialReview.stars === 1 ? "" : "e"}` : "5 Sterne"
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditing = Boolean(initialReview);
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const numericStars = Number.parseInt(stars, 10);
  const titleMissing = validationAttempted && normalizedTitle.length === 0;
  const starsMissing = validationAttempted && !Number.isFinite(numericStars);
  const descriptionMissing = validationAttempted && normalizedDescription.length === 0;
  const titleTooLong = title.length > MAX_REVIEW_TITLE_LENGTH;
  const descriptionTooLong = description.length > MAX_REVIEW_DESCRIPTION_LENGTH;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationAttempted(true);

    if (!normalizedTitle || !normalizedDescription || !Number.isFinite(numericStars)) {
      setErrorMessage("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    if (titleTooLong) {
      setErrorMessage(`Der Titel darf maximal ${MAX_REVIEW_TITLE_LENGTH} Zeichen haben.`);
      return;
    }

    if (descriptionTooLong) {
      setErrorMessage(`Die Rezension darf maximal ${MAX_REVIEW_DESCRIPTION_LENGTH} Zeichen haben.`);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/reviews", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          customerName,
          artistId,
          title: normalizedTitle,
          description: normalizedDescription,
          stars: numericStars,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Die Rezension konnte nicht gespeichert werden.");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("reviews-updated"));
      router.push(artistPath);
      router.refresh();
    } catch {
      setErrorMessage("Die Rezension konnte nicht gespeichert werden.");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          artistId,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Die Rezension konnte nicht gelöscht werden.");
        setDeleting(false);
        return;
      }

      window.dispatchEvent(new Event("reviews-updated"));
      router.push(artistPath);
      router.refresh();
    } catch {
      setErrorMessage("Die Rezension konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  };

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <p className="text-sm text-black/55">{isEditing ? "Rezension bearbeiten für" : "Rezension für"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-black sm:text-4xl">{artistName}</h1>
      </div>

      <div className="space-y-4 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titel der Rezension"
          maxLength={MAX_REVIEW_TITLE_LENGTH}
          aria-invalid={titleMissing}
          className={`h-14 w-full rounded-full border bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black ${
            titleMissing ? "border-red-500 focus:border-red-600" : "border-black/35"
          }`}
        />
        {titleMissing ? <p className="-mt-2 text-xs text-red-600">Bitte einen Titel eingeben.</p> : null}

        <SingleSelectDropdown
          placeholder="Sternebewertung auswählen"
          options={STAR_OPTIONS}
          value={stars}
          onChange={setStars}
          hasError={starsMissing}
        />
        {starsMissing ? <p className="-mt-2 text-xs text-red-600">Bitte eine Sternebewertung auswählen.</p> : null}

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Deine Rezension"
          maxLength={MAX_REVIEW_DESCRIPTION_LENGTH}
          aria-invalid={descriptionMissing}
          className={`min-h-52 w-full resize-none rounded-[28px] border bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black ${
            descriptionMissing ? "border-red-500 focus:border-red-600" : "border-black/35"
          }`}
        />
        {descriptionMissing ? <p className="-mt-2 text-xs text-red-600">Bitte eine Rezension schreiben.</p> : null}
        <p className="-mt-2 text-right text-xs text-black/55">
          {description.length} / {MAX_REVIEW_DESCRIPTION_LENGTH}
        </p>

        <p className="-mt-2 text-sm leading-6 text-black">
          * Pflichtfelder sind Titel, Sternebewertung und Rezension. Maximal {MAX_REVIEW_DESCRIPTION_LENGTH} Zeichen.
        </p>

        {errorMessage ? (
          <p className="rounded-[22px] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">{errorMessage}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black bg-black px-5 text-sm font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Wird gespeichert..." : isEditing ? "Änderungen speichern" : "Rezension absenden"}
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={deleting}
              className="inline-flex h-11 items-center justify-center rounded-full border border-red-500 bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Wird gelöscht..." : "Rezension löschen"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/25 px-5 text-sm font-semibold text-black transition hover:border-black hover:bg-black/5"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </form>
  );
}