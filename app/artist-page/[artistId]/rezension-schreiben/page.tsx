/**
 * Seitenkomponente fuer die Route Artist Page/ArtistId/Rezension Schreiben.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/mongodb";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { buildArtistPath, extractArtistIdFromParam } from "@/lib/artist-url";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../../../components/site-shell";

import { ReviewForm } from "./review-form";

type ReviewPageProps = {
  params: Promise<{ artistId: string }> | { artistId: string };
  searchParams?: Promise<{ edit?: string }> | { edit?: string };
};

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { artistId: artistParam } = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artistId = extractArtistIdFromParam(artistParam);

  if (!artistId || !ObjectId.isValid(artistId)) {
    redirect("/browse-artists");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const db = await getDb();
  const session = await findSessionByToken(db, token);

  if (!session || !ObjectId.isValid(session.userId)) {
    redirect("/login");
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
  const artist = await db.collection("artists").findOne({ _id: new ObjectId(artistId) });
  const artistPath = artist
    ? buildArtistPath(artist._id.toString(), typeof artist.artistName === "string" ? artist.artistName : "")
    : `/artist-page/${artistId}`;

  if (!user || !artist || user.role !== "customer") {
    redirect(artistPath);
  }

  const hasAcceptedRequest = Boolean(
    await db.collection("bookingRequests").findOne({
      customerUserId: user._id.toString(),
      artistId,
      accepted: true,
    })
  );

  if (!hasAcceptedRequest) {
    redirect(artistPath);
  }

  const existingReview = await db.collection("reviews").findOne({
    customerId: user._id.toString(),
    artistId,
  });

  const isEditMode = resolvedSearchParams.edit === "true";

  if (existingReview && !isEditMode) {
    redirect(artistPath);
  }

  if (!existingReview && isEditMode) {
    redirect(artistPath);
  }

  const reviewTitle = typeof existingReview?.title === "string" ? existingReview.title : "";
  const reviewDescription = typeof existingReview?.description === "string" ? existingReview.description : "";
  const reviewStars = typeof existingReview?.stars === "number" ? existingReview.stars : 5;

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-black">
      <SiteHeader activeHref="/browse-artists" />

      <section className={`py-16 ${PAGE_FRAME}`}>
        <div className="mx-auto w-full max-w-3xl">
          <ReviewForm
            artistId={artistId}
            artistPath={artistPath}
            customerId={user._id.toString()}
            customerName={[
              typeof user.firstName === "string" ? user.firstName.trim() : "",
              typeof user.lastName === "string" ? user.lastName.trim() : "",
            ]
              .filter((entry) => entry.length > 0)
              .join(" ")}
            artistName={typeof artist.artistName === "string" && artist.artistName.trim().length > 0 ? artist.artistName : "Unbekannter Künstler"}
            initialReview={
              existingReview
                ? {
                    title: reviewTitle,
                    description: reviewDescription,
                    stars: reviewStars,
                  }
                : undefined
            }
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}