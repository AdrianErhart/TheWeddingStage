/**
 * Seitenkomponente fuer die Route Start Booking.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DatePickerField, TimePickerField } from "../components/booking-datetime-picker";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

function InputField({
  placeholder,
  type = "text",
  value,
  onChange,
  readOnly = false,
}: {
  placeholder: string;
  type?: string;
  value: string;
  onChange: (nextValue: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      className={`h-14 w-full rounded-full border px-6 text-lg outline-none placeholder:text-black/35 focus:border-black ${
        readOnly
          ? "cursor-not-allowed border-black/20 bg-black/[0.03] text-black/60"
          : "border-black/45 bg-transparent"
      }`}
    />
  );
}

const DEFAULT_MODULE_OPTIONS = [
  "Standesamt",
  "Kirchliche Trauung",
  "Freie Trauung",
  "Sektempfang",
  "Afterparty",
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

type ArtistModulePayload = {
  ok: boolean;
  artist?: {
    id?: string;
    artistName?: string;
    musicAccompaniment?: string[];
  };
};

type ProfilePayload = {
  ok: boolean;
  authenticated?: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  customer?: {
    phone?: string;
    address?: {
      street?: string;
      zip?: string;
      city?: string;
    };
    bookingDefaults?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      locationName?: string;
      locationStreet?: string;
      locationZip?: string;
      locationCity?: string;
      plannerEmail?: string;
      venueEmail?: string;
      estimatedBudget?: string;
      additionalInfo?: string;
    };
  };
};

type BookingRequestResponse = {
  ok: boolean;
  message?: string;
  id?: string;
};

function ModulePill({ label, selected = false, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-6 py-3 text-lg transition ${
        selected
          ? "border-black bg-black text-white"
          : "border-black/45 bg-white text-black/40 hover:bg-black hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function StartBookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId")?.trim() ?? "";
  const [artistName, setArtistName] = useState("");
  const [availableModules, setAvailableModules] = useState<string[]>(DEFAULT_MODULE_OPTIONS);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationStreet, setLocationStreet] = useState("");
  const [locationZip, setLocationZip] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [plannerEmail, setPlannerEmail] = useState("");
  const [venueEmail, setVenueEmail] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfileData = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });

        if (!active || !response.ok) {
          return;
        }

        const payload = (await response.json()) as ProfilePayload;
        if (!payload.ok || payload.authenticated !== true || payload.user?.role !== "customer") {
          return;
        }

        const nextFirstName = payload.user.firstName?.trim() ?? "";
        const nextLastName = payload.user.lastName?.trim() ?? "";
        const nextEmail = payload.user.email?.trim() ?? "";
        const nextAddress = payload.customer?.address;
        const bookingDefaults = payload.customer?.bookingDefaults;

        setFirstName(nextFirstName);
        setLastName(nextLastName);
        setEmail(nextEmail);
        setPhone(payload.customer?.phone?.trim() ?? "");
        setStreet(nextAddress?.street?.trim() ?? "");
        setZip(nextAddress?.zip?.trim() ?? "");
        setCity(nextAddress?.city?.trim() ?? "");
        setStartDate(bookingDefaults?.startDate?.trim() ?? "");
        setStartTime(bookingDefaults?.startTime?.trim() ?? "");
        setEndDate(bookingDefaults?.endDate?.trim() ?? "");
        setEndTime(bookingDefaults?.endTime?.trim() ?? "");
        setLocationName(bookingDefaults?.locationName?.trim() ?? "");
        setLocationStreet(bookingDefaults?.locationStreet?.trim() ?? "");
        setLocationZip(bookingDefaults?.locationZip?.trim() ?? "");
        setLocationCity(bookingDefaults?.locationCity?.trim() ?? "");
        setPlannerEmail(bookingDefaults?.plannerEmail?.trim() ?? "");
        setVenueEmail(bookingDefaults?.venueEmail?.trim() ?? "");
        setEstimatedBudget(bookingDefaults?.estimatedBudget?.trim() ?? "");
        setAdditionalInfo(bookingDefaults?.additionalInfo?.trim() ?? "");
      } catch {
        // Keep form usable even if profile prefill fails.
      }
    };

    void loadProfileData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadModules = async () => {
      if (!artistId) {
        setArtistName("");
        setAvailableModules(DEFAULT_MODULE_OPTIONS);
        return;
      }

      try {
        const response = await fetch(`/api/artists/${artistId}`, { cache: "no-store" });
        const payload = (await response.json()) as ArtistModulePayload;

        if (!active || !response.ok || !payload.ok) {
          return;
        }

        const normalizedArtistName =
          typeof payload.artist?.artistName === "string" ? payload.artist.artistName.trim() : "";
        setArtistName(normalizedArtistName);

        const rawModules = Array.isArray(payload.artist?.musicAccompaniment)
          ? payload.artist.musicAccompaniment
          : [];
        const normalized = Array.from(
          new Set(rawModules.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0))
        );

        setAvailableModules(normalized.length > 0 ? normalized : DEFAULT_MODULE_OPTIONS);
      } catch {
        if (active) {
          setAvailableModules(DEFAULT_MODULE_OPTIONS);
        }
      }
    };

    void loadModules();

    return () => {
      active = false;
    };
  }, [artistId]);

  const selectedModulesInScope = selectedModules.filter((entry) => availableModules.includes(entry));

  const toggleModule = (label: string) => {
    setSelectedModules((current) =>
      current.includes(label) ? current.filter((entry) => entry !== label) : [...current, label]
    );
  };
  const displayArtistName = artistName || "Künstler";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!artistId) {
      setFeedback({ ok: false, text: "Ungültiger Künstler-Link." });
      return;
    }

    if (selectedModulesInScope.length === 0) {
      setFeedback({ ok: false, text: "Bitte wähle mindestens ein Modul aus." });
      return;
    }

    if (!isValidPhoneInput(phone)) {
      setFeedback({ ok: false, text: "Bitte gib eine gültige Telefonnummer ein." });
      return;
    }

    if (!isValidEstimatedBudgetInput(estimatedBudget)) {
      setFeedback({ ok: false, text: "Bitte gib ein gültiges Budget ein (z. B. 1500 oder 1500 EUR)." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistId,
          contact: {
            firstName,
            lastName,
            email,
            phone,
            street,
            zip,
            city,
          },
          event: {
            startDate,
            startTime,
            endDate,
            endTime,
            locationName,
            locationStreet,
            locationZip,
            locationCity,
            plannerEmail,
            venueEmail,
            estimatedBudget,
          },
          additionalInfo,
          modules: selectedModulesInScope,
          saveToProfile,
        }),
      });

      const payload = (await response.json()) as BookingRequestResponse;

      if (!response.ok || !payload.ok) {
        setFeedback({ ok: false, text: payload.message || "Deine Anfrage konnte nicht versendet werden." });
        return;
      }

      router.push(`/artist-page/${artistId}?bookingSent=1`);
    } catch {
      setFeedback({ ok: false, text: "Deine Anfrage konnte nicht versendet werden." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader activeHref="/browse-artists" />

      <section className={`py-16 ${PAGE_FRAME}`}>
        <h1 className="mb-14 text-center text-4xl font-semibold leading-tight tracking-tight text-black sm:text-5xl lg:text-6xl">
          {displayArtistName} anfragen
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-20 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-medium sm:text-[1.55rem]">
                Bitte gib deine Kontaktdaten an:
              </h2>

              <div className="mt-8 space-y-5">
                <InputField type="email" placeholder="deine@email.de" value={email} onChange={setEmail} readOnly />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InputField placeholder="Vorname" value={firstName} onChange={setFirstName} />
                  <InputField placeholder="Nachname" value={lastName} onChange={setLastName} />
                </div>
                <InputField placeholder="Straße + Nr" value={street} onChange={setStreet} />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InputField placeholder="Postleitzahl" value={zip} onChange={setZip} />
                  <InputField placeholder="Ort" value={city} onChange={setCity} />
                </div>
                <InputField placeholder="Telefonnummer" type="tel" value={phone} onChange={setPhone} />
              </div>

              <p className="mt-4 text-sm leading-6 text-black">
                * Pflichtfelder sind E-Mail, Vorname und Nachname.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-medium sm:text-[1.55rem]">
                Bitte gib deine Veranstaltungsdaten an:
              </h2>

              <div className="mt-8 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DatePickerField hint="Startdatum" value={startDate} onChange={setStartDate} />
                    <TimePickerField hint="Startzeit" value={startTime} onChange={setStartTime} />
                    <DatePickerField hint="Enddatum" value={endDate} onChange={setEndDate} />
                    <TimePickerField hint="Endzeit" value={endTime} onChange={setEndTime} />
                </div>

                <InputField
                  placeholder="Name der Location"
                  value={locationName}
                  onChange={setLocationName}
                />
                <InputField
                  placeholder="Straße + Nr der Location"
                  value={locationStreet}
                  onChange={setLocationStreet}
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InputField
                    placeholder="Postleitzahl der Location"
                    value={locationZip}
                    onChange={setLocationZip}
                  />
                  <InputField placeholder="Ort der Location" value={locationCity} onChange={setLocationCity} />
                </div>
                <InputField
                  type="email"
                  placeholder="Mailadresse des Hochzeitsplaners"
                  value={plannerEmail}
                  onChange={setPlannerEmail}
                />
                <InputField
                  type="email"
                  placeholder="Mailadresse der Location"
                  value={venueEmail}
                  onChange={setVenueEmail}
                />
                <InputField placeholder="Geschätztes Budget" value={estimatedBudget} onChange={setEstimatedBudget} />
              </div>

              <p className="mt-4 text-sm leading-6 text-black">
                * Pflichtfelder sind Start- und Enddatum sowie Start- und Endzeit.
              </p>
            </div>
          
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-medium sm:text-[1.55rem]">
              Zusatzinformationen (optional):
            </h2>

            <textarea
              value={additionalInfo}
              onChange={(event) => setAdditionalInfo(event.target.value)}
              placeholder="Art der Veranstaltung, gewünschte Dauer, Musikwünsche, etc."
              className="mt-8 h-87.5 w-full rounded-[28px] border border-black/35 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-medium sm:text-[1.55rem]">
              Welche Module möchtest du buchen?
            </h2>

            <div className="mt-6 flex flex-wrap gap-4">
              {availableModules.map((moduleLabel) => (
                <ModulePill
                  key={moduleLabel}
                  label={moduleLabel}
                  selected={selectedModulesInScope.includes(moduleLabel)}
                  onClick={() => toggleModule(moduleLabel)}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="mt-2 flex cursor-pointer items-start gap-4 text-lg leading-8 text-black/75">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(event) => setSaveToProfile(event.target.checked)}
                className="mt-1 h-5 w-5 cursor-pointer rounded border border-black/40 accent-black focus:ring-2 focus:ring-black/20"
              />
              <span>
                Meine Kontakt- und Veranstaltungsdaten in meinem Profil speichern, damit das Formular beim nächsten Mal vorausgefüllt wird.
              </span>
            </label>
          </div>

          {feedback ? (
            <div className="lg:col-span-2">
              <p
                className={`rounded-full border px-5 py-3 text-sm ${
                  feedback.ok
                    ? "border-emerald-500/20 bg-emerald-50 text-emerald-900"
                    : "border-red-500/20 bg-red-50 text-red-900"
                }`}
              >
                {feedback.text}
              </p>
            </div>
          ) : null}

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-20 w-full cursor-pointer items-center justify-center rounded-[28px] bg-black text-3xl font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Anfrage wird gesendet ..." : "Jetzt anfragen"}
            </button>
          </div>
        </form>
      </section>

      <SiteFooter />
    </main>
  );
}

export default function StartBookingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-black" />}>
      <StartBookingPageContent />
    </Suspense>
  );
}