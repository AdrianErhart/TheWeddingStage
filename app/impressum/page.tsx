/**
 * Seitenkomponente fuer die Route Impressum.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#f4f2ef] text-black">
      <SiteHeader activeHref={null} />

      <section className={`py-16 sm:py-20 ${PAGE_FRAME}`}>
        <div className="mx-auto max-w-4xl rounded-[2.5rem] bg-white p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:p-12">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Impressum</h1>

          <div className="mt-10 space-y-8 text-base leading-8 text-black/75">
            <section>
              <h2 className="text-xl font-semibold text-black">Angaben gemäß § 5 TMG</h2>
              <p className="mt-3">
                TheWeddingStage GbR<br />
                Adrian Erhart &amp; Niklas Schwedas<br />
                Blumenstraße 18<br />
                80331 München<br />
                Deutschland
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Kontakt</h2>
              <p className="mt-3">
                Telefon: +49 89 12345678<br />
                E-Mail: info@theweddingstage.de
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Vertreten durch</h2>
              <p className="mt-3">Adrian Erhart und Niklas Schwedas</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Umsatzsteuer-ID</h2>
              <p className="mt-3">Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE123456789</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p className="mt-3">
                Adrian Erhart<br />
                Blumenstraße 18<br />
                80331 München
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Haftung für Inhalte</h2>
              <p className="mt-3">
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
                Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
                überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">Haftung für Links</h2>
              <p className="mt-3">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
                fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
                Seiten verantwortlich.
              </p>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
