/**
 * Seitenkomponente fuer die Route Artist Page/ArtistId.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import Image from "next/image";
import Link from "next/link";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import { getDb } from "@/lib/mongodb";
import { hasMissingArtistMinimumFields } from "@/lib/artist-completeness";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { buildArtistPath, extractArtistIdFromParam } from "@/lib/artist-url";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../../components/site-shell";
import { ProfileView } from "../../profile/profile-view";
import { AdaptiveStickyColumns } from "./adaptive-sticky-columns";
import { BackToOverviewButton } from "./back-to-overview-button";
import { RepertoireList, ReviewsList } from "./detail-lists";
import { GalleryCarousel } from "./gallery-carousel";

function listOrFallback(values: unknown, fallback: string) {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  return values.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).join(", ");
}

function renderIfPresent(label: string, value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return (
    <p className="break-words whitespace-pre-line">
      <span className="font-semibold text-black">{label}:</span> {value}
    </p>
  );
}

function renderBlockIfPresent(label: string, value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return (
    <div className="break-words whitespace-pre-line">
      <span className="font-semibold text-black">{label}:</span> {value}
    </div>
  );
}

function getYouTubeEmbedUrl(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function getSoundCloudEmbedUrl(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(value);
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%23000000&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false`;
  } catch {
    return null;
  }
}

function getSpotifyEmbedUrl(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  try {
    if (value.startsWith("spotify:")) {
      const [, type, id] = value.split(":");

      if (type && id) {
        return `https://open.spotify.com/embed/${type}/${id}`;
      }
    }

    const url = new URL(value);

    if (url.hostname.includes("open.spotify.com")) {
      const segments = url.pathname.split("/").filter(Boolean);
      const supportedTypes = ["track", "album", "playlist", "episode", "artist"];
      const typeIndex = segments.findIndex((segment) => supportedTypes.includes(segment));

      if (typeIndex >= 0 && segments[typeIndex + 1]) {
        const type = segments[typeIndex];
        const id = segments[typeIndex + 1];
        return `https://open.spotify.com/embed/${type}/${id}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function formatReviewDate(value: unknown) {
  if (!(value instanceof Date)) {
    return null;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

type ArtistPageProps = {
  params: Promise<{ artistId: string }> | { artistId: string };
  searchParams?: Promise<{ edit?: string; bookingSent?: string; from?: string }> | { edit?: string; bookingSent?: string; from?: string };
};

export default async function ArtistDetailPage({ params, searchParams }: ArtistPageProps) {
  const { artistId: artistParam } = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artistId = extractArtistIdFromParam(artistParam);

  if (!artistId || !ObjectId.isValid(artistId)) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-black">
        <SiteHeader activeHref="/browse-artists" />
        <section className={`py-16 ${PAGE_FRAME}`}>
          <p className="rounded-[28px] border border-black/15 bg-white p-8 text-sm text-black/65 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
            Artist nicht gefunden.
          </p>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const db = await getDb();
  const artist = await db.collection("artists").findOne({ _id: new ObjectId(artistId) });

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-black">
        <SiteHeader activeHref="/browse-artists" />
        <section className={`py-16 ${PAGE_FRAME}`}>
          <p className="rounded-[28px] border border-black/15 bg-white p-8 text-sm text-black/65 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
            Artist nicht gefunden.
          </p>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let canEditProfile = false;
  let canWriteReview = false;
  let artistOwner = null;
  let customerAlreadyReviewed = false;
  let isCustomerViewer = false;
  let isArtistViewer = false;
  let isAuthenticatedViewer = false;
  let customerCanReviewArtist = false;

  if (token) {
    const session = await findSessionByToken(db, token);
    const user = session && ObjectId.isValid(session.userId)
      ? await db.collection("users").findOne({ _id: new ObjectId(session.userId) })
      : null;

    if (session && user) {
      isAuthenticatedViewer = true;
    }

    if (session && ObjectId.isValid(session.userId) && session.userId === artist.userId) {
      canEditProfile = true;
    }

    if (user?.role === "customer") {
      isCustomerViewer = true;
      customerCanReviewArtist = Boolean(
        await db.collection("bookingRequests").findOne({
          customerUserId: user._id.toString(),
          artistId: artist._id.toString(),
          accepted: true,
        })
      );
      canWriteReview = customerCanReviewArtist;
      customerAlreadyReviewed = Boolean(
        await db.collection("reviews").findOne({
          customerId: user._id.toString(),
          artistId: artist._id.toString(),
        })
      );
    }

    if (user?.role === "artist") {
      isArtistViewer = true;
    }

    if (session && ObjectId.isValid(session.userId) && session.userId === artist.userId) {
      artistOwner = user;
    }
  }

  const isEditMode = resolvedSearchParams.edit === "true" && Boolean(artistOwner);
  const bookingSent = resolvedSearchParams.bookingSent === "1";
  const showBackToOverview = !canEditProfile || resolvedSearchParams.from === "browse";

  const setlist = Array.isArray(artist.songs) && artist.songs.length > 0 ? artist.songs : [];
  const galleryImages = Array.isArray(artist.galleryImages) ? artist.galleryImages : [];
  const reviews = await db
    .collection("reviews")
    .find({ artistId: artist._id.toString() })
    .sort({ createdAt: -1 })
    .toArray();
  const reviewCustomerIds = Array.from(
    new Set(
      reviews
        .map((review) => (typeof review.customerId === "string" ? review.customerId : ""))
        .filter((customerId) => ObjectId.isValid(customerId))
    )
  );
  const reviewCustomers = reviewCustomerIds.length
    ? await db
        .collection("users")
        .find({ _id: { $in: reviewCustomerIds.map((customerId) => new ObjectId(customerId)) } })
        .toArray()
    : [];
  const reviewCustomerNames = new Map(
    reviewCustomers.map((customer) => {
      const firstName = typeof customer.firstName === "string" ? customer.firstName.trim() : "";
      const lastName = typeof customer.lastName === "string" ? customer.lastName.trim() : "";
      return [
        customer._id.toString(),
        [firstName, lastName].filter((entry) => entry.length > 0).join(" "),
      ] as const;
    })
  );

  const youtubeEmbedUrl = getYouTubeEmbedUrl(typeof artist.youtubeUrl === "string" ? artist.youtubeUrl : undefined);
  const youtubeEmbedUrl2 = getYouTubeEmbedUrl(typeof artist.youtubeUrl2 === "string" ? artist.youtubeUrl2 : undefined);
  const soundCloudEmbedUrl = getSoundCloudEmbedUrl(
    typeof artist.soundcloudUrl === "string" ? artist.soundcloudUrl : undefined
  );
  const spotifyEmbedUrl = getSpotifyEmbedUrl(typeof artist.spotifyUrl === "string" ? artist.spotifyUrl : undefined);
  const hasReferences =
    youtubeEmbedUrl !== null || youtubeEmbedUrl2 !== null || spotifyEmbedUrl !== null || soundCloudEmbedUrl !== null;
  const headerActiveHref = canEditProfile ? null : "/browse-artists";
  const reviewRatings = reviews
    .map((review) => (typeof review.stars === "number" ? review.stars : null))
    .filter((stars): stars is number => stars !== null);
  const reviewItems = reviews.map((review) => ({
    id: review._id.toString(),
    title: typeof review.title === "string" && review.title.trim().length > 0 ? review.title : "Ohne Titel",
    stars: typeof review.stars === "number" ? review.stars : null,
    customerName:
      typeof review.customerName === "string" && review.customerName.trim().length > 0
        ? review.customerName
        : reviewCustomerNames.get(review.customerId) || "Anonymer Kunde",
    description:
      typeof review.description === "string" && review.description.trim().length > 0
        ? review.description
        : "Keine Beschreibung vorhanden.",
    dateLabel: formatReviewDate(review.date) ?? formatReviewDate(review.createdAt) ?? "",
  }));
  const averageReviewRating = reviewRatings.length > 0
    ? (reviewRatings.reduce((sum, stars) => sum + stars, 0) / reviewRatings.length).toFixed(1)
    : null;
  const artistPath = buildArtistPath(
    artist._id.toString(),
    typeof artist.artistName === "string" ? artist.artistName : ""
  );

  if (isEditMode && artistOwner) {
    const missingMinimumFields = hasMissingArtistMinimumFields(artist);

    const artistProfileData = {
      user: {
        firstName: artistOwner.firstName ?? "",
        lastName: artistOwner.lastName ?? "",
        email: artistOwner.email ?? "",
        role: artistOwner.role,
      },
      artist: {
        artistName: artist.artistName ?? "",
        description: artist.description ?? "",
        profilePicture: artist.profilePicture ?? "",
        galleryImages: Array.isArray(artist.galleryImages) ? artist.galleryImages : [],
        genre: Array.isArray(artist.genre) ? artist.genre : [],
        instruments: Array.isArray(artist.instruments) ? artist.instruments : [],
        musicAccompaniment: Array.isArray(artist.musicAccompaniment) ? artist.musicAccompaniment : [],
        bandSize: artist.bandSize ?? "",
        location: artist.location ?? "",
        radius: artist.radius ?? "",
        latitude: typeof artist.latitude === "number" ? artist.latitude : null,
        longitude: typeof artist.longitude === "number" ? artist.longitude : null,
        soundcloudUrl: artist.soundcloudUrl ?? "",
        spotifyUrl: artist.spotifyUrl ?? "",
        youtubeUrl: artist.youtubeUrl ?? "",
        youtubeUrl2: artist.youtubeUrl2 ?? "",
        technicalInfo: artist.technicalInfo ?? "",
        songs: Array.isArray(artist.songs) ? artist.songs : [],
        unavailableDates: Array.isArray(artist.unavailableDates)
          ? artist.unavailableDates.filter((entry): entry is string => typeof entry === "string")
          : [],
      },
      customer: null,
    };

    return (
      <main className="min-h-screen bg-[#f5f5f5] text-black">
        <SiteHeader activeHref={headerActiveHref} />

        <section className={`py-16 ${PAGE_FRAME}`}>
          <div className="mx-auto w-full max-w-4xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Dein Profil bearbeiten</h1>
            <p className="mt-5 text-base leading-7 text-black/60 sm:text-lg sm:leading-8">
              Hier kannst du deine Kontodaten und dein Künstlerprofil bearbeiten.
            </p>
            {missingMinimumFields ? (
              <p className="mt-4 rounded-[20px] border border-amber-300 bg-amber-100 px-5 py-4 text-center text-sm leading-6 text-amber-900 sm:text-base">
                Mache alle Mindestangaben (mit * gekennzeichnet), damit dein Künstlerprofil öffentlich gefunden wird.
              </p>
            ) : null}

            <ProfileView initialData={artistProfileData} initialEditing backHref={artistPath} />
          </div>
        </section>

        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-black">
      <SiteHeader activeHref={headerActiveHref} />

      <section className={`pb-16 pt-10 ${PAGE_FRAME}`}>
        {showBackToOverview ? (
          <div className="mb-8">
            <BackToOverviewButton />
          </div>
        ) : null}

        <AdaptiveStickyColumns
          left={(
            <div className="rounded-[28px] border border-black/15 bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:p-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              {typeof artist.profilePicture === "string" && artist.profilePicture.length > 0 ? (
                <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[26px] bg-black sm:max-w-[360px]">
                  <Image
                    src={artist.profilePicture}
                    alt={String(artist.artistName ?? "Artist")}
                    fill
                    sizes="(max-width: 640px) 320px, 360px"
                    className="object-cover"
                  />
                </div>
              ) : null}

              <div className="mt-6 min-w-0">
                <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">
                  {typeof artist.artistName === "string" && artist.artistName.trim().length > 0
                    ? artist.artistName
                    : "Unbekannter Künstler"}
                </h1>

                {!canEditProfile && isCustomerViewer ? (
                  <div className="mx-auto mt-5 w-full max-w-[320px] sm:max-w-[360px]">
                    <Link
                      href={`/start-booking?artistId=${artist._id.toString()}`}
                      className="flex h-12 w-full items-center justify-center rounded-full border border-black bg-black px-7 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                    >
                      Jetzt anfragen
                    </Link>
                    {bookingSent ? (
                      <p className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900">
                        Deine Anfrage wurde versendet.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canEditProfile ? (
                  <div className="mt-5">
                    <Link
                      href={`${artistPath}?edit=true`}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-black bg-black px-6 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                    >
                      Profil bearbeiten
                    </Link>
                  </div>
                ) : null}

                {!canEditProfile && !isCustomerViewer ? (
                  <div className="mx-auto mt-5 w-full max-w-[320px] sm:max-w-[360px]">
                    <button
                      type="button"
                      disabled
                      className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-black/20 bg-black/10 px-7 text-sm font-semibold text-black/35"
                    >
                      Jetzt anfragen
                    </button>
                    <p className="mt-2 text-center text-xs text-black/50">
                      {isAuthenticatedViewer || isArtistViewer ? (
                        "Als Kunde anmelden, um anzufragen."
                      ) : (
                        <>
                          <Link href="/login" className="underline underline-offset-2 transition hover:text-black">
                            Als Kunde anmelden
                          </Link>
                          {", "}um anzufragen.
                        </>
                      )}
                    </p>
                  </div>
                ) : null}

                {typeof artist.description === "string" && artist.description.trim().length > 0 ? (
                  <div className="mx-auto mt-6 max-w-2xl space-y-5 text-base leading-7 text-black/75 sm:text-lg sm:leading-8">
                    <p className="break-words whitespace-pre-line">{artist.description}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 min-w-0 space-y-5 text-base leading-7 text-black/75 sm:text-lg sm:leading-8">
              {renderIfPresent("Bandgröße", typeof artist.bandSize === "string" ? artist.bandSize : undefined)}
              {renderIfPresent("Genre", listOrFallback(artist.genre, ""))}
              {renderIfPresent("Instrumente", listOrFallback(artist.instruments, ""))}
              {renderIfPresent("Ort", typeof artist.location === "string" ? artist.location : undefined)}
              {renderIfPresent("Umkreis", typeof artist.radius === "string" ? artist.radius : undefined)}
              {renderIfPresent(
                "Rahmen für Musikbegleitung",
                listOrFallback(artist.musicAccompaniment, "")
              )}
              {renderBlockIfPresent("Technische Informationen", typeof artist.technicalInfo === "string" ? artist.technicalInfo : undefined)}
            </div>

            {hasReferences ? (
              <div className="mt-8">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Referenzen</h2>
                <div className="mt-6 space-y-5">
                  {youtubeEmbedUrl ? (
                    <div className="aspect-video overflow-hidden rounded-[22px] border border-black/10 bg-black/5">
                      <iframe
                        src={youtubeEmbedUrl}
                        title="YouTube Referenz"
                        className="block h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {youtubeEmbedUrl2 ? (
                    <div className="aspect-video overflow-hidden rounded-[22px] border border-black/10 bg-black/5">
                      <iframe
                        src={youtubeEmbedUrl2}
                        title="YouTube Referenz 2"
                        className="block h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {spotifyEmbedUrl ? (
                    <div
                      className="overflow-hidden"
                      style={{
                        borderRadius: "14px 14px 22px 22px",
                        clipPath: "inset(0 round 14px 14px 22px 22px)",
                      }}
                    >
                      <iframe
                        src={spotifyEmbedUrl}
                        title="Spotify Referenz"
                        className="block h-40 w-full border-0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  {soundCloudEmbedUrl ? (
                    <iframe
                      src={soundCloudEmbedUrl}
                      title="SoundCloud Referenz"
                      className="block h-44 w-full overflow-hidden rounded-[22px] border border-black/10 bg-black/5"
                      allow="autoplay"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {galleryImages.length > 0 ? (
              <GalleryCarousel images={galleryImages} />
            ) : null}
            </div>
          )}
          right={(
            <div className="flex flex-col-reverse gap-6 xl:block xl:space-y-6">
              <section className="rounded-[28px] border border-black/15 bg-white p-8 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Rezensionen</h2>
              {averageReviewRating ? (
                <p className="mt-3 text-sm font-medium text-black/65">
                  Durchschnitt: {averageReviewRating} / 5
                </p>
              ) : null}
              {canWriteReview && !customerAlreadyReviewed ? (
                <div className="mt-5">
                  <Link
                    href={`${artistPath}/rezension-schreiben`}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-black bg-black px-5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                  >
                    Rezension schreiben
                  </Link>
                </div>
              ) : null}
              {canWriteReview && customerAlreadyReviewed ? (
                <div className="mt-5 rounded-[22px] border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <p>Du hast den Künstler bereits bewertet.</p>
                  <div className="mt-3">
                    <Link
                      href={`${artistPath}/rezension-schreiben?edit=true`}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-white hover:text-emerald-600"
                    >
                      Rezension bearbeiten
                    </Link>
                  </div>
                </div>
              ) : null}
              {!canWriteReview && !customerAlreadyReviewed && isCustomerViewer ? (
                <p className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Rezensionen kannst du erst schreiben, wenn deine Anfrage angenommen wurde.
                </p>
              ) : null}
              <div className="mt-8 space-y-5 text-sm leading-6 text-black/75">
                <ReviewsList reviews={reviewItems} batchSize={5} />
              </div>
              </section>

              <section className="rounded-[28px] border border-black/15 bg-white p-8 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Repertoire</h2>
                <div className="mt-6 space-y-1 text-sm leading-6 text-black/80">
                  <RepertoireList songs={setlist} batchSize={50} />
                </div>
              </section>
            </div>
          )}
        />

        {!canEditProfile ? (
          <div className="mt-16">
            {isCustomerViewer ? (
              <Link
                href={`/start-booking?artistId=${artist._id.toString()}`}
                className="flex h-20 w-full items-center justify-center rounded-[28px] bg-black text-3xl font-semibold text-white transition hover:bg-black/85"
              >
                Jetzt anfragen
              </Link>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled
                  className="flex h-20 w-full cursor-not-allowed items-center justify-center rounded-[28px] bg-black/25 text-3xl font-semibold text-white/80"
                >
                  Jetzt anfragen
                </button>
                <p className="text-sm text-black/65">
                  {isAuthenticatedViewer || isArtistViewer ? (
                    "Melde dich als Kunde an, um den Künstler anzufragen."
                  ) : (
                    <>
                      <Link href="/login" className="underline underline-offset-2 transition hover:text-black/90">
                        Melde dich als Kunde an
                      </Link>
                      , um den Künstler anzufragen.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}