/**
 * Seitenkomponente fuer die Route Profile.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileView } from "./profile-view";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";
import { getDb } from "@/lib/mongodb";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { buildArtistPath } from "@/lib/artist-url";

export default async function ProfilePage() {
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

  if (!user) {
    redirect("/login");
  }

  const artist = await db.collection("artists").findOne({ userId: user._id.toString() });

  if (user.role === "artist") {
    if (artist) {
      redirect(buildArtistPath(artist._id.toString(), typeof artist.artistName === "string" ? artist.artistName : ""));
    }

    redirect("/browse-artists");
  }

  const customer = await db.collection("customers").findOne({ userId: user._id.toString() });

  const profileData = {
    user: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      role: user.role,
    },
    artist: artist
      ? {
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
        }
      : null,
    customer: customer
      ? {
          phone: customer.phone ?? "",
          address: customer.address ?? { street: "", zip: "", city: "" },
          bookingDefaults: customer.bookingDefaults ?? {
            startDate: "",
            startTime: "",
            endDate: "",
            endTime: "",
            locationName: "",
            locationStreet: "",
            locationZip: "",
            locationCity: "",
            plannerEmail: "",
            venueEmail: "",
            estimatedBudget: "",
            additionalInfo: "",
          },
        }
      : null,
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader activeHref="/profile" />

      <section className={`flex min-h-[calc(100vh-176px)] flex-col items-center py-16 ${PAGE_FRAME}`}>
        <div className="w-full max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Dein Profil bearbeiten</h1>
          <p className="mt-5 text-base leading-7 text-black/60 sm:text-lg sm:leading-8">
            Hier kannst du deine Kontodaten, Kundendaten und Veranstaltungsdaten bearbeiten.
          </p>

          <ProfileView initialData={profileData} initialEditing />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}