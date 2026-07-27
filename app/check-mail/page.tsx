/**
 * Seitenkomponente fuer die Route Check Mail.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import Link from "next/link";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

function UserIcon() {
  return (
    <div className="mx-auto relative h-16 w-16">
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute bottom-0 left-1/2 h-8 w-14 -translate-x-1/2 rounded-t-full bg-black" />
    </div>
  );
}

export default function CheckMailPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader activeHref="/login" />

      <section className={`flex min-h-[calc(100vh-176px)] flex-col items-center justify-center py-16 ${PAGE_FRAME}`}>
        <div className="max-w-[760px] text-center">
          <UserIcon />
          <h1 className="mt-4 text-2xl font-medium sm:text-[1.55rem]">
            Registrierung bestätigen
          </h1>

          <p className="mt-10 text-xl font-light text-black/65 sm:text-[1.35rem]">
            Wir haben dir eine Mail geschickt. Bitte klicke auf den Link, um deine
            Registrierung zu bestätigen. Schaue ggf. auch in deinem Spam-Ordner nach.
          </p>

          <div className="mt-10 flex justify-center gap-6 text-sm text-black/60 underline underline-offset-2">
            <Link href="/login" className="transition hover:text-black">
              Zum Login
            </Link>
                  <Link href="/register" className="transition hover:text-black">
              Zur Registrierung
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}