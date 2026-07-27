/**
 * Seitenkomponente fuer die Route Page.Tsx.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import Link from "next/link";
import Image from "next/image";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "./components/site-shell";
import { HomeHeroSearch } from "./components/home-hero-search";
import { HomeContactForm } from "./components/home-contact-form";
import { WelcomePopup } from "./components/welcome-popup";

const genres = [
  { label: "EDM", src: "/EDM.png" },
  { label: "Rock", src: "/Rock.png" },
  { label: "Acoustic", src: "/Acoustic.png" },
  { label: "Jazz", src: "/Jazz.png" },
];

const instruments = [
  { label: "Gitarre", src: "/Gitarre.png" },
  { label: "Klavier", src: "/Klavier.png" },
  { label: "Saxophon", src: "/Saxophon.png" },
  { label: "Violine", src: "/Geige.png" },
];

const bandSizes = [
  { label: "Solo", src: "/Solo.png" },
  { label: "2 Personen", src: "/2_Personen.png" },
  { label: "3 Personen", src: "/Band.png" },
  { label: "4 oder mehr Personen", src: "/Festival.png" },
];

function CategoryRow({
  title,
  items,
  filterKey,
}: {
  title: string;
  items: { label: string; src: string }[];
  filterKey: "genre" | "instrument" | "bandSize";
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-2xl font-semibold tracking-tight text-white">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.label}
            href={`/browse-artists?${filterKey}=${encodeURIComponent(item.label)}`}
            className="group relative h-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/20"
          >
            <Image
              src={item.src}
              alt={item.label}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 18vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-center text-sm font-medium text-white">
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f2ef] text-black">
      <WelcomePopup />
      <SiteHeader theme="dark" activeHref="/" logoHref="#top" />

      <section
        id="top"
        className="relative isolate z-20 min-h-190 overflow-visible bg-black"
      >
        <Image
          src="/Header_Couple.png"
          alt="Brautpaar tanzt vor Live-Band"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_top] md:object-top lg:object-[center_14%] opacity-90"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/45 to-black/10" />
        <div className={`relative flex min-h-190 flex-col pb-16 pt-16 text-white lg:pb-20 ${PAGE_FRAME}`}>
          <div className="mt-auto max-w-3xl">
            <h1 className="max-w-xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Finde deine Musik.
            </h1>
            <p className="mt-3 text-base text-white/85 sm:text-lg">
              Jetzt Gig buchen.
            </p>
          </div>

          <HomeHeroSearch />
        </div>
      </section>

      <section id="about" className="bg-[#f4f2ef] py-10">
        <div className={PAGE_FRAME}>
          <div className="rounded-[2.5rem] bg-black px-8 py-16 text-white shadow-[0_24px_60px_rgba(0,0,0,0.24)] sm:px-12 lg:px-16">
            <div className="max-w-3xl space-y-6">
              <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Hochzeiten sollen Spaß machen - keinen Stress.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                Deswegen wollen wir dir zumindest die Suche nach der perfekten
                musikalischen Begleitung erleichtern.
              </p>
              <p className="max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                Für mehr Emotion, mehr Liebe, mehr Gefühl.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section id="browse" className="bg-[#f4f2ef] pb-12">
        <div className={PAGE_FRAME}>
          <div className="rounded-[2.5rem] bg-black px-6 py-14 text-white sm:px-10 lg:px-14">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Noch unsicher?
                </h2>
              </div>
              <p className="max-w-lg text-lg font-medium text-white/90 lg:justify-self-end">
                Vielleicht helfen dir diese Kategorien.
              </p>
            </div>

            <div className="mt-12 space-y-10">
              <CategoryRow title="Genre" items={genres} filterKey="genre" />
              <CategoryRow title="Instrument" items={instruments} filterKey="instrument" />
              <CategoryRow title="Bandgröße" items={bandSizes} filterKey="bandSize" />
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#f4f2ef] py-16">
        <div className={`grid gap-8 lg:grid-cols-2 lg:items-start ${PAGE_FRAME}`}>
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              Nichts gefunden? ;(
            </h2>
            <p className="mt-5 w-full text-base leading-7 text-black/75">
              Schick uns eine Nachricht mit deiner Wunschbegleitung und den
              groben Eckdaten zu deiner Veranstaltung. Gerne suchen wir für dich
              nach einer passenden Band ;)
            </p>
          </div>

          <HomeContactForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}