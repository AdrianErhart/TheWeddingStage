/**
 * Seitenkomponente fuer die Route Artist Page.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { redirect } from "next/navigation";

import { getDb } from "@/lib/mongodb";
import { buildArtistPath } from "@/lib/artist-url";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";
type ArtistPageProps = {
  searchParams?: Promise<{ artistId?: string }>;
};

export default async function ArtistPage({ searchParams }: ArtistPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const artistId = resolvedSearchParams?.artistId;

  if (artistId) {
    redirect(`/artist-page/${artistId}`);
  }

  const db = await getDb();
  const firstArtist = await db.collection("artists").findOne({});

  if (firstArtist?._id) {
    redirect(
      buildArtistPath(
        firstArtist._id.toString(),
        typeof firstArtist.artistName === "string" ? firstArtist.artistName : ""
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-black">
      <SiteHeader activeHref="/browse-artists" />
      <section className={`py-16 ${PAGE_FRAME}`}>
        <p className="rounded-[28px] border border-black/15 bg-white p-8 text-sm text-black/65 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          Noch kein Artist vorhanden.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}