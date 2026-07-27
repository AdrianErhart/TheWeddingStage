/**
 * Seitenkomponente fuer die Route About Us.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import Image from "next/image";

import { HomeContactForm } from "../components/home-contact-form";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-[#f4f2ef] text-black">
      <SiteHeader activeHref="/about-us" />

      <section className={`grid gap-8 pb-20 pt-16 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:items-stretch lg:pt-24 ${PAGE_FRAME}`}>
        <div className="flex justify-center mb-6 lg:mb-0 lg:block lg:h-full">
          <div className="relative h-175 w-full lg:h-full lg:max-w-none overflow-hidden rounded-[2.5rem] border border-black/10 bg-black shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <Image
              src="/Header_Couple.png"
              alt="Brautpaar vor Live-Band"
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-[86%_top] md:object-[82%_top] lg:object-[74%_14%] opacity-90"
            />
            <div className="absolute inset-0 bg-linear-to-br from-black/65 via-black/45 to-black/35" />
            <div className="relative flex h-full flex-col justify-end p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">TheWeddingStage</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Musik für Hochzeiten einfacher machen.</h2>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-full">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
              Hi! Wir sind Niklas und Adrian.
            </h1>

            <div className="mt-8 space-y-6 text-base leading-8 text-black/75 sm:text-lg sm:leading-9 text-justify">
              <p>
                Wir haben TheWeddingStage gebaut, weil die Suche nach guter Live-Musik für Hochzeiten oft unnötig kompliziert ist.
                Zwischen unübersichtlichen Plattformen, verstreuten Infos und vielen offenen Fragen wird aus der schönen Suche schnell
                ein zeitaufwändiger Vergleich.
              </p>
              <p>
                Genau das wollen wir einfacher machen: Hochzeitsmusiker sollen klar vorgestellt werden, mit den Infos, die wirklich
                wichtig sind. So findet ihr schneller den passenden Künstler für eure Feier, euren Stil und eure Stimmung.
              </p>
              <p>
                Gleichzeitig soll es für Künstler unkompliziert sein, ihre Musik sichtbar zu machen und direkt von Paaren gefunden zu
                werden, die genau nach ihrem Sound suchen.
              </p>
              <p>
                Unsere Idee ist einfach: Weniger Suchen, mehr passende Musik. Oder anders gesagt: Worauf wartet ihr noch?
                Meldet euch an, als Kunde oder als Künstler, und lasst uns gemeinsam die Suche nach Hochzeitsmusik leichter machen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f2ef] py-16">
          <div className={`grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start ${PAGE_FRAME}`}>
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              Du hast eine Frage? Oder bist nicht fündig geworden? ;(
            </h2>
            <p className="mt-5 w-full text-base leading-7 text-black/75">
              Dann schreib uns einfach eine Nachricht über das Formular und wir melden uns so schnell wie möglich wieder bei dir!
            </p>
          </div>

          <HomeContactForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}