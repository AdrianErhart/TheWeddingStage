This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## MongoDB Atlas verbinden

Lege im Projekt-Root eine Datei `.env.local` an und trage deine Atlas-Verbindung ein:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
# Optional: eigene Datenbank angeben, sonst wird die Default-DB aus der URI genutzt.
MONGODB_DB=theweddingstage
```

Ohne diese Datei kann die Registrierung keine Daten in MongoDB speichern und zeigt genau diesen Fehler an.

Zum Testen der Verbindung kannst du danach die MongoDB-Endpunkte aufrufen.

Wenn du die Datenbank und die vier gewünschten Collections gezielt anlegen willst, rufe `GET /api/init-db` auf. Dabei werden `users`, `artists`, `customers` und `reviews` erstellt.

## Deployment auf Render

Die App ist bereits so aufgebaut, dass sie nicht nur lokal läuft. Für Render brauchst du im Kern nur ein Git-Repo, die passenden Umgebungsvariablen und die beiden Standard-Commands.

### 1. Projekt auf Render anlegen

1. Melde dich bei Render an und gehe auf New.
2. Wähle Web Service.
3. Verbinde dein GitHub-Repository mit dem Projekt.
4. Wähle den Branch aus, den du deployen willst.

### 2. Build- und Start-Commands setzen

Trage diese Werte ein:

1. Build Command: `npm run build`
2. Start Command: `npm run start`
3. Node Version: am besten eine aktuelle 20er- oder 22er-Version

### 3. Umgebungsvariablen setzen

Lege in Render unter Environment die folgenden Variablen an:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=theweddingstage
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=mail@deinedomain.de
SMTP_FROM_NAME=TheWeddingStage
CONTACT_ADMIN_EMAIL=info@deinedomain.de
SITE_URL=https://dein-service.onrender.com
```

`SITE_URL` sollte deine spätere öffentliche Render-URL oder deine eigene Domain enthalten. Darüber werden E-Mail-Links korrekt gebaut.

### 4. Bereitstellen

1. Speichere die Einstellungen.
2. Starte das erste Deployment.
3. Warte, bis Render den Build abgeschlossen hat.
4. Öffne die bereitgestellte URL und teste die Seite.

### 5. Nach dem ersten Deployment testen

Prüfe danach mindestens diese Punkte:

1. Startseite lädt ohne Fehler.
2. Registrierung funktioniert mit MongoDB.
3. E-Mail-Versand funktioniert mit deinen SMTP-Daten.
4. Login, Kontaktformular und Passwort-Reset erzeugen korrekte Links.

Wenn du später eine eigene Domain an Render bindest, änderst du nur `SITE_URL` auf diese Domain und lässt den Rest gleich.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
