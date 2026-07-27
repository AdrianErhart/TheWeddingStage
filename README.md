# TheWeddingStage

Webanwendung für die Suche, Darstellung und Buchungsanfrage von Hochzeitskünstlern.

Online erreichbar unter:
https://theweddingstage.onrender.com/

## Lokal starten

1. Datei `.env.local` im Projektroot anlegen.
2. Umgebungsvariablen eintragen.
3. Abhängigkeiten installieren.
4. Dev-Server starten.

Beispiel für `.env.local`:

```bash
# Datenbank
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=theweddingstage

# SMTP / Mailversand
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=mail@example.com
SMTP_PASS=<dein-passwort>
SMTP_FROM=mail@example.com
SMTP_FROM_NAME=TheWeddingStage
CONTACT_ADMIN_EMAIL=admin@example.com

# Öffentliche URL für Links in E-Mails
SITE_URL=https://theweddingstage.onrender.com

# Optional (Fallbacks)
NEXT_PUBLIC_SITE_URL=https://theweddingstage.onrender.com
```

Hinweise zu Variablen:

- Pflicht für die App: `MONGODB_URI`
- Pflicht für Mailversand: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_ADMIN_EMAIL`
- Optional: `MONGODB_DB` (sonst Default-DB aus URI), `SMTP_FROM_NAME` (wird Empfänger angezeigt statt E-Mail-Adresse), `SITE_URL` (Öffentliche URL), `NEXT_PUBLIC_SITE_URL` (Öffentliche URL Fallback für Render)

Abhängigkeiten installieren und Dev-Server starten:

```bash
npm install
npm run dev
```

Danach lokal öffnen:
http://localhost:3000

## Funktionen

- Registrierung und Login mit serverseitiger Session
- E-Mail-Verifizierung bei Registrierung per Link
- Passwort-zurücksetzen per E-Mail-Link
- Profilverwaltung für Kunden und Künstler
- Vereinfachte Suche und Kategorievorschläge auf der Startseite
- Künstlersuche mit vielen Filtern (Ort, Datum, Genre, Instrumente, Bandgröße, Rahmen)
- Detailseiten für Künstler mit Infos, Medien und Rezensionen
- Buchungsanfragen mit Event- und Kontaktdaten per Formular versenden -> E-Mail-Benachrichtung an Kunde und Künstler
- Rezensionen schreiben, bearbeiten und löschen -> nur möglich, nachdem der Künstler die Anfrage angenommen hat
- Kontaktformular -> nach Absenden wird Admin der Seite sowie Absender per Mail informiert

## Tech-Stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS
- Backend: Next.js Route Handlers
- Datenbank: MongoDB
- Auth/Session: HttpOnly-Cookie + serverseitige Session-Tabelle
- Mail: Nodemailer (SMTP)

## Projektstruktur

- `app/`: Seiten, Komponenten und API-Route-Handler
- `app/api/`: Backend-Endpunkte (Auth, Profile, Artists, Requests, Contact, Mail)
- `lib/`: zentrale Logik (MongoDB, Session, URL-Helfer, Geocoding, Utils)
- `public/`: statische Assets und Bilder

## API (Kurzüberblick)

Auth und Session:

- `POST /api/users` Registrierung
- `POST /api/login` Login
- `GET /api/logout` Logout
- `GET /api/session` aktuelle Session
- `GET /api/verify-email` E-Mail bestätigen
- `POST /api/forgot-password` Passwort-Reset anstoßen

Artists:

- `GET /api/artists` Liste mit Filtern/Pagination
- `POST /api/artists` Artist-Profil anlegen
- `GET /api/artists/[artistId]` Artist laden
- `PATCH /api/artists/update` Artist aktualisieren

Buchung und Bewertungen:

- `POST /api/booking-requests` Buchungsanfrage senden
- `PATCH /api/booking-requests/[requestId]` Anfrage bearbeiten
- `GET /api/reviews` Reviews laden
- `POST /api/reviews` Review erstellen

Weitere Endpunkte:

- `POST /api/contact` Kontaktformular senden
- `GET /api/location-suggestions` Ortsvorschläge
- `POST /api/validate-location` Ort validieren
- `GET /api/init-db` benötigte Collections initialisieren
- `GET /api/profile`, `PATCH /api/profile` Profil lesen/ändern

## Besonderheiten

- Passwörter werden mit bcrypt gehasht und verschlüsselt in der Datenbank gespeichert
- SMTP-Versand für Verifizierung, Passwort-Reset, Kontaktformular und Anfrageformular
- Geocoding und Distanzfilter auf Basis von OpenStreetMap/Nominatim
- Datumsauswahl mit React Calendar für Hochzeitsdatum und Abwesenheiten
- Einbettungen per iFrame (z. B. YouTube, SoundCloud, Spotify)
