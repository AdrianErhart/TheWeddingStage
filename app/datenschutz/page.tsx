/**
 * Seitenkomponente fuer die Route Datenschutz.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#f4f2ef] text-black">
      <SiteHeader activeHref={null} />

      <section className={`py-16 sm:py-20 ${PAGE_FRAME}`}>
        <div className="mx-auto max-w-4xl rounded-[2.5rem] bg-white p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:p-12">
          <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-5xl">Datenschutzerklärung</h1>

          <div className="mt-10 space-y-8 text-base leading-8 text-black/75">
            <section>
              <h2 className="text-xl font-semibold text-black">1. Allgemeine Hinweise</h2>
              <p className="mt-3">
                Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. In dieser Datenschutzerklärung informieren wir darüber,
                welche Daten auf dieser Website verarbeitet werden und zu welchen Zwecken dies geschieht.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">2. Verantwortliche Stelle</h2>
              <p className="mt-3">
                TheWeddingStage GbR<br />
                Adrian Erhart &amp; Niklas Schwedas<br />
                Blumenstraße 18<br />
                80331 München<br />
                E-Mail: datenschutz@theweddingstage.de
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">3. Erhebung und Speicherung personenbezogener Daten</h2>
              <p className="mt-3">
                Beim Besuch dieser Website können technische Daten wie IP-Adresse, Browsertyp, Betriebssystem, Uhrzeit des Zugriffs sowie aufgerufene
                Seiten automatisch verarbeitet werden. Darüber hinaus verarbeiten wir Daten, die Sie uns aktiv über Formulare mitteilen, beispielsweise
                Ihre E-Mail-Adresse und Ihre Nachricht.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">4. Zweck der Datenverarbeitung</h2>
              <p className="mt-3">
                Die Verarbeitung Ihrer Daten erfolgt, um die Website bereitzustellen, Kontaktanfragen zu beantworten, die Nutzung unserer Plattform zu
                ermöglichen und die Sicherheit unserer Systeme zu gewährleisten.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">5. Kontaktformular</h2>
              <p className="mt-3">
                Wenn Sie uns über das Kontaktformular schreiben, werden die von Ihnen eingegebenen Daten ausschließlich zur Bearbeitung Ihrer Anfrage
                und für mögliche Rückfragen verwendet.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">6. Speicherdauer</h2>
              <p className="mt-3">
                Personenbezogene Daten werden nur so lange gespeichert, wie dies zur Erfüllung des jeweiligen Zwecks erforderlich ist oder gesetzliche
                Aufbewahrungspflichten bestehen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">7. Ihre Rechte</h2>
              <p className="mt-3">
                Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie auf Datenübertragbarkeit. Außerdem haben
                Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">8. Stand</h2>
              <p className="mt-3">Stand dieser Datenschutzerklärung: Juli 2026</p>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
