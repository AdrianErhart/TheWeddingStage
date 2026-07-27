/**
 * Feature-Modul fuer Profilansicht und Profilbearbeitung.
 * Die Datei steuert das Lesen, Darstellen und Aktualisieren profilibezogener Daten fuer die angemeldete Person.
 */
"use client";

import { useMemo, useState } from "react";
import Calendar from "react-calendar";

import { DatePickerField, TimePickerField } from "../components/booking-datetime-picker";
import { CityAutocomplete } from "../components/city-autocomplete";
import { SquareImageField } from "../components/square-image-field";
import { LinkValidator } from "../components/link-validator";
import { RADIUS_OPTIONS } from "@/lib/radius-label";

type ProfileData = {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: "artist" | "customer";
  };
  artist: null | {
    artistName: string;
    description: string;
    profilePicture: string;
    galleryImages: string[];
    genre: string[];
    instruments: string[];
    musicAccompaniment: string[];
    bandSize: string;
    location: string;
    radius: string;
    soundcloudUrl: string;
    spotifyUrl: string;
    youtubeUrl: string;
    youtubeUrl2: string;
    technicalInfo: string;
    songs: string[];
    unavailableDates: string[];
    latitude?: number | null;
    longitude?: number | null;
  };
  customer: null | {
    phone: string;
    address: {
      street: string;
      zip: string;
      city: string;
    };
    bookingDefaults: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      locationName: string;
      locationStreet: string;
      locationZip: string;
      locationCity: string;
      plannerEmail: string;
      venueEmail: string;
      estimatedBudget: string;
      additionalInfo: string;
    };
  };
};

function textToList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function listToCommaText(values: string[]): string {
  return values.join(", ");
}

function normalizeDateKey(value: Date | string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return dateKey;
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

function toMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function shiftMonth(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function shiftYear(value: Date, amount: number) {
  return new Date(value.getFullYear() + amount, value.getMonth(), 1);
}

const GENRE_OPTIONS = ["Pop", "Rock", "Jazz", "EDM", "Acoustic", "Metal", "Hip-Hop", "Classical", "R&B", "Country"];
const INSTRUMENT_OPTIONS = ["Gesang", "Gitarre", "Klavier", "Drums", "Bass", "Saxophon", "Violine", "Cello", "Keyboard", "Trompete"];
const BAND_SIZE_OPTIONS = ["Solo", "2 Personen", "3 Personen", "4 oder mehr Personen"];
const MUSIC_ACCOMPANIMENT_OPTIONS = ["Standesamt", "Kirchliche Trauung", "Freie Trauung", "Sektempfang", "Afterparty"];
const PASSWORD_RULES = [
  { label: "Mind. 8 Zeichen", test: (value: string) => value.length >= 8 },
  { label: "Mind. 1 Kleinbuchstabe", test: (value: string) => /[a-z]/.test(value) },
  { label: "Mind. 1 Großbuchstabe", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Mind. 1 Zahl", test: (value: string) => /\d/.test(value) },
  { label: "Mind. 1 Sonderzeichen", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];
const PHONE_PATTERN = /^[0-9+()\s/-]{6,25}$/;
const BUDGET_PATTERN = /^\d{1,7}([.,]\d{1,2})?(\s?(€|EUR))?$/i;

function isValidPhoneInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return PHONE_PATTERN.test(trimmed);
}

function isValidEstimatedBudgetInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return BUDGET_PATTERN.test(trimmed);
}

function MultiSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-12 w-full items-center justify-between rounded-full border border-black/45 bg-transparent px-4 text-base text-black/35 outline-none transition hover:border-black sm:h-14 sm:px-6 sm:text-lg"
      >
        <span className={`min-w-0 truncate text-left ${value.length > 0 ? "text-black" : "text-black/35"}`}>
          {value.length > 0 ? value.join(", ") : placeholder}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10">
          <div className="max-h-64 space-y-2 overflow-auto text-left text-sm text-black/80">
            {options.map((option) => {
              const checked = value.includes(option);
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-black/5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onChange(
                        checked ? value.filter((entry) => entry !== option) : [...value, option]
                      );
                    }}
                    className="h-4 w-4 accent-black"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
            >
              Fertig
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SingleSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (nextValue: string) => void;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-12 w-full items-center justify-between rounded-full border border-black/45 bg-transparent px-4 text-base text-black/35 outline-none transition hover:border-black sm:h-14 sm:px-6 sm:text-lg"
      >
        <span className={`min-w-0 truncate text-left ${value ? "text-black" : "text-black/35"}`}>
          {value || placeholder}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10">
          <div className="max-h-64 space-y-1 overflow-auto text-left text-sm text-black/80">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  onOpenChange(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-black/5 ${
                  value === option ? "bg-black/5 text-black" : ""
                }`}
              >
                <span>{option}</span>
                {value === option ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ProfileEditorProps = {
  initialData: ProfileData;
  formId?: string;
  onSaveResult?: (result: { ok: boolean; message: string }) => void;
};

export function ProfileEditor({ initialData, formId, onSaveResult }: ProfileEditorProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => toMonthStart(today));
  const [firstName, setFirstName] = useState(initialData.user.firstName);
  const [lastName, setLastName] = useState(initialData.user.lastName);
  const [email, setEmail] = useState(initialData.user.email);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [artistName, setArtistName] = useState(initialData.artist?.artistName ?? "");
  const [profilePicture, setProfilePicture] = useState(initialData.artist?.profilePicture ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData.artist?.galleryImages ?? []);
  const [selectedGenres, setSelectedGenres] = useState(initialData.artist?.genre ?? []);
  const [selectedInstruments, setSelectedInstruments] = useState(initialData.artist?.instruments ?? []);
  const [musicAccompaniment, setMusicAccompaniment] = useState(initialData.artist?.musicAccompaniment ?? []);
  const [bandSize, setBandSize] = useState(initialData.artist?.bandSize ?? "");
  const [location, setLocation] = useState(initialData.artist?.location ?? "");
  const [radius, setRadius] = useState(initialData.artist?.radius ?? "");
  const [soundcloudUrl, setSoundcloudUrl] = useState(initialData.artist?.soundcloudUrl ?? "");
  const [spotifyUrl, setSpotifyUrl] = useState(initialData.artist?.spotifyUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialData.artist?.youtubeUrl ?? "");
  const [youtubeUrl2, setYoutubeUrl2] = useState(initialData.artist?.youtubeUrl2 ?? "");
  const [description, setDescription] = useState(initialData.artist?.description ?? "");
  const [technicalInfo, setTechnicalInfo] = useState(initialData.artist?.technicalInfo ?? "");
  const [songs, setSongs] = useState(listToCommaText(initialData.artist?.songs ?? []));
  const [unavailableDates, setUnavailableDates] = useState<string[]>(() => {
    const rawDates = initialData.artist?.unavailableDates ?? [];
    const normalizedDates = rawDates
      .map((entry) => normalizeDateKey(entry))
      .filter((entry) => entry.length > 0);

    return Array.from(new Set(normalizedDates)).sort();
  });
  const [street, setStreet] = useState(initialData.customer?.address.street ?? "");
  const [zip, setZip] = useState(initialData.customer?.address.zip ?? "");
  const [city, setCity] = useState(initialData.customer?.address.city ?? "");
  const [phone, setPhone] = useState(initialData.customer?.phone ?? "");
  const [bookingStartDate, setBookingStartDate] = useState(initialData.customer?.bookingDefaults.startDate ?? "");
  const [bookingStartTime, setBookingStartTime] = useState(initialData.customer?.bookingDefaults.startTime ?? "");
  const [bookingEndDate, setBookingEndDate] = useState(initialData.customer?.bookingDefaults.endDate ?? "");
  const [bookingEndTime, setBookingEndTime] = useState(initialData.customer?.bookingDefaults.endTime ?? "");
  const [bookingLocationName, setBookingLocationName] = useState(initialData.customer?.bookingDefaults.locationName ?? "");
  const [bookingLocationStreet, setBookingLocationStreet] = useState(initialData.customer?.bookingDefaults.locationStreet ?? "");
  const [bookingLocationZip, setBookingLocationZip] = useState(initialData.customer?.bookingDefaults.locationZip ?? "");
  const [bookingLocationCity, setBookingLocationCity] = useState(initialData.customer?.bookingDefaults.locationCity ?? "");
  const [bookingPlannerEmail, setBookingPlannerEmail] = useState(initialData.customer?.bookingDefaults.plannerEmail ?? "");
  const [bookingVenueEmail, setBookingVenueEmail] = useState(initialData.customer?.bookingDefaults.venueEmail ?? "");
  const [bookingEstimatedBudget, setBookingEstimatedBudget] = useState(initialData.customer?.bookingDefaults.estimatedBudget ?? "");
  const [bookingAdditionalInfo, setBookingAdditionalInfo] = useState(initialData.customer?.bookingDefaults.additionalInfo ?? "");
  const [locationLat, setLocationLat] = useState<number | null>(
    typeof initialData.artist?.latitude === "number" ? initialData.artist.latitude : null
  );
  const [locationLng, setLocationLng] = useState<number | null>(
    typeof initialData.artist?.longitude === "number" ? initialData.artist.longitude : null
  );
  const [openDropdown, setOpenDropdown] = useState<"bandSize" | "genre" | "instruments" | "accompaniment" | "radius" | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationValidating, setLocationValidating] = useState(false);
  const [locationValidated, setLocationValidated] = useState(
    Boolean(
      (initialData.artist?.location ?? "").trim().length > 0
      && typeof initialData.artist?.latitude === "number"
      && typeof initialData.artist?.longitude === "number"
    )
  );
  const isArtist = initialData.user.role === "artist";
  const unavailableDateSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    valid: rule.test(password),
  }));
  const isPasswordValid = passwordChecks.every((rule) => rule.valid);

  const toggleUnavailableDate = (date: Date) => {
    const dateKey = normalizeDateKey(date);

    if (!dateKey) {
      return;
    }

    setUnavailableDates((current) => {
      if (current.includes(dateKey)) {
        return current.filter((entry) => entry !== dateKey);
      }

      return [...current, dateKey].sort();
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (firstName.trim().length === 0 || lastName.trim().length === 0) {
      onSaveResult?.({ ok: false, message: "Vorname und Nachname dürfen nicht leer sein." });
      return;
    }

    if (!isValidPhoneInput(phone)) {
      onSaveResult?.({ ok: false, message: "Bitte gib eine gültige Telefonnummer ein." });
      return;
    }

    if (!isValidEstimatedBudgetInput(bookingEstimatedBudget)) {
      onSaveResult?.({ ok: false, message: "Bitte gib ein gültiges Budget ein (z. B. 1500 oder 1500 EUR)." });
      return;
    }

    if (isArtist && artistName.trim().length === 0) {
      onSaveResult?.({ ok: false, message: "Der Künstlername ist ein Pflichtfeld und darf nicht leer sein." });
      return;
    }

    if (password.trim().length > 0 && !isPasswordValid) {
      onSaveResult?.({ ok: false, message: "Das Passwort erfüllt die Mindestanforderungen noch nicht." });
      return;
    }

    if (password.trim().length > 0 && password !== repeatPassword) {
      onSaveResult?.({ ok: false, message: "Die Passwörter stimmen nicht überein." });
      return;
    }

    if (
      isArtist
      && location.trim().length > 0
      && (!locationValidated || typeof locationLat !== "number" || typeof locationLng !== "number")
    ) {
      setLocationError("Bitte wähle eine Stadt aus den Vorschlägen aus.");
      onSaveResult?.({ ok: false, message: "Bitte wähle eine Stadt aus den OpenStreetMap-Vorschlägen aus." });
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role: initialData.user.role,
          artistName,
          description,
          profilePicture,
          galleryImages,
          genre: selectedGenres,
          instruments: selectedInstruments,
          musicAccompaniment,
          bandSize,
          location,
          radius,
          unavailableDates: isArtist ? unavailableDates : undefined,
          ...(isArtist && typeof locationLat === "number" && typeof locationLng === "number"
            ? { latitude: locationLat, longitude: locationLng }
            : {}),
          soundcloudUrl,
          spotifyUrl,
          youtubeUrl,
          youtubeUrl2,
          technicalInfo,
          songs: textToList(songs),
          phone,
          address: {
            street,
            zip,
            city,
          },
          bookingDefaults: {
            startDate: bookingStartDate,
            startTime: bookingStartTime,
            endDate: bookingEndDate,
            endTime: bookingEndTime,
            locationName: bookingLocationName,
            locationStreet: bookingLocationStreet,
            locationZip: bookingLocationZip,
            locationCity: bookingLocationCity,
            plannerEmail: bookingPlannerEmail,
            venueEmail: bookingVenueEmail,
            estimatedBudget: bookingEstimatedBudget,
            additionalInfo: bookingAdditionalInfo,
          },
        }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        onSaveResult?.({ ok: false, message: payload.message ?? "Das Profil konnte nicht gespeichert werden." });
        return;
      }

      setPassword("");
      setRepeatPassword("");
      onSaveResult?.({ ok: true, message: "Profil gespeichert." });
    } catch {
      onSaveResult?.({ ok: false, message: "Das Profil konnte nicht gespeichert werden." });
    }
  };

  return (
    <form id={formId} className="mt-10 space-y-6 text-left" onSubmit={handleSubmit}>
      <h2 className="text-lg font-medium">Kontodaten</h2>

      <section className="grid gap-4 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5 sm:grid-cols-2">
        <input
          type="email"
          value={email}
          readOnly
          placeholder="E-Mail"
          className="h-14 w-full cursor-not-allowed rounded-full border border-black/20 bg-black/[0.03] px-6 text-lg text-black/60 outline-none placeholder:text-black/35 sm:col-span-2"
        />
        <p className="-mt-2 text-xs text-black/50 sm:col-span-2">Die E-Mail-Adresse ist fest mit deinem Account verknüpft und kann nicht geändert werden.</p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Neues Passwort setzen"
          className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
        />

        <div className="space-y-2 text-sm text-black/60 sm:col-span-2">
          {passwordChecks.map((rule) => (
            <div key={rule.label} className={rule.valid ? "text-black" : "text-black/50"}>
              {rule.valid ? "✓" : "•"} {rule.label}
            </div>
          ))}
        </div>

        <input
          type="password"
          value={repeatPassword}
          onChange={(event) => setRepeatPassword(event.target.value)}
          placeholder="Neues Passwort bestätigen"
          className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
        />
      </section>

      {isArtist ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Künstlerprofil</h2>

          <section className="space-y-4 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
            <div className="mx-auto w-full max-w-[320px] space-y-4 text-center">
              <SquareImageField
                mode="single"
                label="Profilbild auswählen"
                selectedLabel="Profilbild ändern"
                value={profilePicture}
                onChange={setProfilePicture}
              />

              <input
                type="text"
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                placeholder="Künstlername *"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-center text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
            </div>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kurzbeschreibung *"
              className="min-h-44 w-full resize-none rounded-[28px] border border-black/45 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <SingleSelectDropdown placeholder="Bandgröße wählen *" options={BAND_SIZE_OPTIONS} value={bandSize} onChange={setBandSize} open={openDropdown === "bandSize"} onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "bandSize" : null)} />
              </div>

              <div className="min-w-0">
                <MultiSelectDropdown
                  placeholder="Genre auswählen *"
                  options={GENRE_OPTIONS}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  open={openDropdown === "genre"}
                  onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "genre" : null)}
                />
              </div>

              <div className="min-w-0">
                <MultiSelectDropdown
                  placeholder="Instrumente auswählen *"
                  options={INSTRUMENT_OPTIONS}
                  value={selectedInstruments}
                  onChange={setSelectedInstruments}
                  open={openDropdown === "instruments"}
                  onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "instruments" : null)}
                />
              </div>

              <div className="min-w-0">
                <MultiSelectDropdown
                  placeholder="Rahmen für Musikbegleitung auswählen *"
                  options={MUSIC_ACCOMPANIMENT_OPTIONS}
                  value={musicAccompaniment}
                  onChange={setMusicAccompaniment}
                  open={openDropdown === "accompaniment"}
                  onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "accompaniment" : null)}
                />
              </div>

              <div className="min-w-0">
                <CityAutocomplete
                  value={location}
                  onChange={(nextValue) => {
                    setLocation(nextValue);
                    setLocationError("");
                    setLocationLat(null);
                    setLocationLng(null);
                    setLocationValidated(false);
                  }}
                  onSelectSuggestion={(suggestion) => {
                    setLocation(suggestion.displayName);
                    setLocationLat(suggestion.lat);
                    setLocationLng(suggestion.lng);
                    setLocationError("");
                    setLocationValidated(true);
                  }}
                  placeholder="Stadt eingeben *"
                  disabled={locationValidating}
                  inputClassName={`h-12 w-full rounded-full border bg-transparent px-4 text-base outline-none placeholder:text-black/35 focus:border-black sm:h-14 sm:px-6 sm:text-lg ${
                    location && locationError
                      ? "border-red-500 focus:border-red-600"
                      : location && locationValidated
                        ? "border-emerald-500 focus:border-emerald-600"
                        : "border-black/45"
                  }`}
                />
                <p className="mt-2 text-xs text-black/50">Wähle bitte einen Vorschlag aus, damit der Ort eindeutig gespeichert wird.</p>
                {locationValidating && <p className="mt-2 text-sm text-black/60">Validiere Stadt...</p>}
                {locationError && (
                  <p className="mt-2 rounded-[22px] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">
                    {locationError}
                  </p>
                )}
                {locationValidated && location && (
                  <p className="mt-2 rounded-[22px] border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    ✓ {location} validiert
                  </p>
                )}
              </div>

              <div className="min-w-0 self-start">
                <SingleSelectDropdown placeholder="Reichweite wählen *" options={RADIUS_OPTIONS} value={radius} onChange={setRadius} open={openDropdown === "radius"} onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "radius" : null)} />
              </div>

              <LinkValidator
                type="youtube"
                value={youtubeUrl}
                onChange={setYoutubeUrl}
                placeholder="Link zu YouTube-Video"
              />

              <LinkValidator
                type="youtube"
                value={youtubeUrl2}
                onChange={setYoutubeUrl2}
                placeholder="Zweiter Link zu YouTube-Video"
              />

              <LinkValidator
                type="soundcloud"
                value={soundcloudUrl}
                onChange={setSoundcloudUrl}
                placeholder="Link zu SoundCloud Song, Album, etc."
              />

              <LinkValidator
                type="spotify"
                value={spotifyUrl}
                onChange={setSpotifyUrl}
                placeholder="Link zu Spotify Song, Album, etc."
              />
            </div>

            <div className="rounded-[26px] border border-black/15 bg-black/[0.02] p-4 sm:p-5">
              <h3 className="text-base font-medium text-black">Kalender: Abwesenheiten</h3>
              <p className="mt-1 text-sm text-black/60">
                Klicke auf ein Datum, um es als nicht verfügbar zu markieren. Ohne Einträge giltst du grundsätzlich als verfügbar.
              </p>

              <div className="mt-4 overflow-x-auto">
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-black/15 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftYear(current, -1))}
                      className="h-9 rounded-full border border-black/20 px-3 text-xs font-medium transition hover:bg-black hover:text-white"
                    >
                      «
                    </button>
                    <span className="min-w-16 text-center text-sm font-semibold text-black">{calendarMonth.getFullYear()}</span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftYear(current, 1))}
                      className="h-9 rounded-full border border-black/20 px-3 text-xs font-medium transition hover:bg-black hover:text-white"
                    >
                      »
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                      className="h-9 w-9 rounded-full border border-black/20 text-sm font-semibold transition hover:bg-black hover:text-white"
                    >
                      ←
                    </button>
                    <span className="min-w-24 text-center text-sm font-semibold text-black">
                      {calendarMonth.toLocaleDateString("de-DE", { month: "long" })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                      className="h-9 w-9 rounded-full border border-black/20 text-sm font-semibold transition hover:bg-black hover:text-white"
                    >
                      →
                    </button>
                  </div>
                </div>

                <Calendar
                  locale="de-DE"
                  activeStartDate={calendarMonth}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) {
                      setCalendarMonth(toMonthStart(activeStartDate));
                    }
                  }}
                  showNavigation={false}
                  minDate={today}
                  onClickDay={toggleUnavailableDate}
                  tileClassName={({ date, view }) => {
                    if (view !== "month") {
                      return "";
                    }

                    const dateKey = normalizeDateKey(date);
                    return unavailableDateSet.has(dateKey)
                      ? "rounded-full bg-black text-white"
                      : "rounded-full hover:bg-black/10";
                  }}
                  className="rounded-2xl border border-black/15 p-2"
                />
              </div>

              {unavailableDates.length > 0 ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {unavailableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => {
                          setUnavailableDates((current) => current.filter((entry) => entry !== date));
                        }}
                        className="rounded-full border border-black/20 bg-white px-3 py-1 text-xs text-black transition hover:bg-black hover:text-white"
                      >
                        {formatDateForDisplay(date)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-black/50">
                    Tipp: Klicke ein ausgewähltes Datum erneut an, um die Abwesenheit wieder zu entfernen.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs text-black/50">Keine Abwesenheitstage gesetzt.</p>
              )}
            </div>

            <textarea
              value={technicalInfo}
              onChange={(event) => setTechnicalInfo(event.target.value)}
              placeholder="Technische Informationen, z. B. Bühne, Strom, PA, Aufbauhinweise"
              className="min-h-52 w-full resize-none rounded-[28px] border border-black/45 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <textarea
                value={songs}
                onChange={(event) => setSongs(event.target.value)}
                placeholder="Songs kommagetrennt eintragen, zum Beispiel: Künstler - Songname, Künstler - Songname, ..."
                className="min-h-52 w-full resize-none rounded-[28px] border border-black/45 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black lg:col-span-2"
              />
            </div>

            <SquareImageField
              mode="gallery"
              label="Galeriebilder hinzufügen"
              values={galleryImages}
              onChange={setGalleryImages}
              maxItems={3}
            />
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Kundendaten</h2>
          <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Vorname"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Nachname"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="text"
                value={street}
                onChange={(event) => setStreet(event.target.value)}
                placeholder="Straße und Hausnummer"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <input
                type="text"
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                placeholder="PLZ"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ort"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Telefonnummer"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
            </div>
          </section>

          <h3 className="text-lg font-medium">Veranstaltungsdaten</h3>
          <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DatePickerField hint="Startdatum" value={bookingStartDate} onChange={setBookingStartDate} />
              <TimePickerField hint="Startzeit" value={bookingStartTime} onChange={setBookingStartTime} />
              <DatePickerField hint="Enddatum" value={bookingEndDate} onChange={setBookingEndDate} />
              <TimePickerField hint="Endzeit" value={bookingEndTime} onChange={setBookingEndTime} />
              <input
                type="text"
                value={bookingLocationName}
                onChange={(event) => setBookingLocationName(event.target.value)}
                placeholder="Name der Location"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <input
                type="text"
                value={bookingLocationStreet}
                onChange={(event) => setBookingLocationStreet(event.target.value)}
                placeholder="Straße + Nr der Location"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <input
                type="text"
                value={bookingLocationZip}
                onChange={(event) => setBookingLocationZip(event.target.value)}
                placeholder="Postleitzahl der Location"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="text"
                value={bookingLocationCity}
                onChange={(event) => setBookingLocationCity(event.target.value)}
                placeholder="Ort der Location"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
              <input
                type="email"
                value={bookingPlannerEmail}
                onChange={(event) => setBookingPlannerEmail(event.target.value)}
                placeholder="Mailadresse des Hochzeitsplaners"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <input
                type="email"
                value={bookingVenueEmail}
                onChange={(event) => setBookingVenueEmail(event.target.value)}
                placeholder="Mailadresse der Location"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <input
                type="text"
                value={bookingEstimatedBudget}
                onChange={(event) => setBookingEstimatedBudget(event.target.value)}
                placeholder="Geschätztes Budget in EUR"
                className="h-14 w-full rounded-full border border-black/35 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
              <textarea
                value={bookingAdditionalInfo}
                onChange={(event) => setBookingAdditionalInfo(event.target.value)}
                placeholder="Art der Veranstaltung, gewünschte Dauer, Musikwünsche, etc."
                className="min-h-44 w-full resize-none rounded-[28px] border border-black/45 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black sm:col-span-2"
              />
            </div>
          </section>
        </div>
      )}
    </form>
  );
}