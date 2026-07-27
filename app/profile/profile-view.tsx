/**
 * Feature-Modul fuer Profilansicht und Profilbearbeitung.
 * Die Datei steuert das Lesen, Darstellen und Aktualisieren profilibezogener Daten fuer die angemeldete Person.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProfileEditor } from "./profile-editor";

type ProfileData = Parameters<typeof ProfileEditor>[0]["initialData"];

type ProfileViewProps = {
  initialData: ProfileData;
  initialEditing?: boolean;
  backHref?: string;
};

function listText(values: string[], fallback: string) {
  return values.length > 0 ? values.join(" • ") : fallback;
}

export function ProfileView({ initialData, initialEditing = false, backHref = "/profile" }: ProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing || initialData.user.role === "customer");
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const saveMessageTimerRef = useRef<number | null>(null);
  const isArtist = initialData.user.role === "artist";
  const editorFormId = "profile-editor-form";
  const actionRowClassName = isArtist
    ? "grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end"
    : "flex items-center justify-center";

  useEffect(() => {
    return () => {
      if (saveMessageTimerRef.current !== null) {
        window.clearTimeout(saveMessageTimerRef.current);
      }
    };
  }, []);

  if (isEditing) {
    return (
      <div className="mt-10 space-y-6 text-left">
        {saveMessage ? (
          <p
            className={`flex h-12 items-center rounded-full border px-5 text-base ${
              saveMessage.ok
                ? "border-emerald-500/20 bg-emerald-50 text-emerald-900"
                : "border-red-500/20 bg-red-50 text-red-900"
            }`}
          >
            {saveMessage.text}
          </p>
        ) : null}

        <div className={actionRowClassName}>
          {isArtist ? (
            <Link
              href={backHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-black px-4 py-3 text-center text-base font-semibold transition hover:bg-black hover:text-white sm:mr-auto sm:w-auto sm:px-6"
            >
              Zurück zur Ansicht
            </Link>
          ) : null}
          <button
            type="submit"
            form={editorFormId}
            disabled={!isEditing}
            className="w-full rounded-full border border-black bg-black px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white sm:w-auto sm:px-6"
          >
            Profil speichern
          </button>
        </div>

        <ProfileEditor
          initialData={initialData}
          formId={editorFormId}
          onSaveResult={(result) => {
            if (saveMessageTimerRef.current !== null) {
              window.clearTimeout(saveMessageTimerRef.current);
            }

            setSaveMessage({ ok: result.ok, text: result.message });
            window.scrollTo({ top: 0, behavior: "smooth" });

            if (result.ok) {
              router.refresh();
            }

            saveMessageTimerRef.current = window.setTimeout(() => {
              setSaveMessage(null);
              saveMessageTimerRef.current = null;
            }, 10000);
          }}
        />

        <div className={actionRowClassName}>
          {isArtist ? (
            <Link
              href={backHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-black px-4 py-3 text-center text-base font-semibold transition hover:bg-black hover:text-white sm:mr-auto sm:w-auto sm:px-6"
            >
              Zurück zur Ansicht
            </Link>
          ) : null}
          <button
            type="submit"
            form={editorFormId}
            disabled={!isEditing}
            className="w-full rounded-full border border-black bg-black px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white sm:w-auto sm:px-6"
          >
            Profil speichern
          </button>
        </div>

      </div>
    );
  }

  if (isArtist) {
    const artist = initialData.artist;

    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start text-left">
        <div className="rounded-[28px] border border-black/15 bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:p-8">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-black bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
            >
              Profil bearbeiten
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="relative aspect-square overflow-hidden rounded-[26px] bg-black">
              {artist?.profilePicture ? (
                <Image
                  src={artist.profilePicture}
                  alt={artist.artistName || "Profilbild"}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="pt-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">
                {artist?.artistName || `${initialData.user.firstName} ${initialData.user.lastName}`.trim()}
              </h1>

              <div className="mt-6 space-y-4 text-base leading-7 text-black/75 sm:text-lg sm:leading-8">
                <p>{artist?.description || "Noch keine Beschreibung hinterlegt."}</p>
                <p>
                  {listText(artist?.genre ?? [], "Genre noch nicht angegeben")}
                </p>
                <p>
                  {listText(artist?.instruments ?? [], "Instrumente noch nicht angegeben")}
                </p>
                <p>
                  {listText(artist?.musicAccompaniment ?? [], "Rahmen für Musikbegleitung noch nicht angegeben")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Songs</h2>
            <div className="mt-6 space-y-2 rounded-[28px] border border-black/10 bg-black/5 p-6 text-lg leading-7 text-black/80">
              {artist?.songs && artist.songs.length > 0 ? (
                artist.songs.map((song, index) => <p key={`${song}-${index}`}>{song}</p>)
              ) : (
                <p>Noch keine Songs hinterlegt.</p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {(artist?.galleryImages ?? []).slice(0, 3).map((image, index) => (
              <div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-[28px] bg-black">
                <Image src={image} alt={`Galeriebild ${index + 1}`} fill className="object-cover" />
              </div>
            ))}
            {(artist?.galleryImages?.length ?? 0) === 0 ? (
              <div className="rounded-[28px] border border-dashed border-black/20 p-8 text-sm text-black/45 md:col-span-3">
                Noch keine Bilder hinterlegt.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className="rounded-[28px] border border-black/15 bg-white p-8 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Details</h2>
            <div className="mt-8 space-y-3 text-sm leading-6 text-black/75">
              <p>Ort: {artist?.location || "-"}</p>
              <p>Bandgröße: {artist?.bandSize || "-"}</p>
              <p>
                Rahmen für Musikbegleitung: {listText(artist?.musicAccompaniment ?? [], "-")}
              </p>
              <p>Umkreis: {artist?.radius || "-"}</p>
              <p>SoundCloud: {artist?.soundcloudUrl || "-"}</p>
              <p>Spotify: {artist?.spotifyUrl || "-"}</p>
              <p>YouTube: {artist?.youtubeUrl || "-"}</p>
              <p>YouTube 2: {artist?.youtubeUrl2 || "-"}</p>
              <p>Technische Informationen: {artist?.technicalInfo || "-"}</p>
            </div>
          </section>
        </aside>
      </div>
    );
  }

}