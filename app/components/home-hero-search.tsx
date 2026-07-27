/**
 * Wiederverwendbare UI-Komponente `home-hero-search`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";

import { CityAutocomplete } from "./city-autocomplete";

function normalizeDateKey(value: Date | string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return "Hochzeitsdatum";
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

function useDropdownOverflowShift(
  open: boolean,
  boundaryRef: RefObject<HTMLFormElement | null>,
  panelRef: RefObject<HTMLDivElement | null>
) {

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    if (!open) {
      panel.style.transform = "";
      return;
    }

    // Auf kleinen Screens wird das Dropdown innerhalb des Formulars gehalten,
    // damit es nicht rechts/links aus dem sichtbaren Bereich rutscht.
    const updateShift = () => {
      const boundary = boundaryRef.current;

      if (!boundary || window.innerWidth >= 1024) {
        panel.style.transform = "";
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      let nextShift = 0;

      if (panelRect.right > boundaryRect.right) {
        nextShift -= panelRect.right - boundaryRect.right;
      }

      if (panelRect.left + nextShift < boundaryRect.left) {
        nextShift += boundaryRect.left - (panelRect.left + nextShift);
      }

      panel.style.transform = nextShift === 0 ? "" : `translateX(${Math.round(nextShift)}px)`;
    };

    const rafId = window.requestAnimationFrame(updateShift);
    window.addEventListener("resize", updateShift);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateShift);
    };
  }, [boundaryRef, open, panelRef]);

}

export function HomeHeroSearch() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const weddingDatePanelRef = useRef<HTMLDivElement | null>(null);
  const locationPanelRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [weddingDate, setWeddingDate] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchLocationInput, setSearchLocationInput] = useState("");
  const [locationSelectionError, setLocationSelectionError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => toMonthStart(today));
  const [openDropdown, setOpenDropdown] = useState<null | "weddingDate" | "location">(null);
  const hasUnconfirmedLocationInput = searchLocationInput.trim().length > 0 && searchLocationInput !== searchLocation;
  useDropdownOverflowShift(openDropdown === "weddingDate", formRef, weddingDatePanelRef);
  useDropdownOverflowShift(openDropdown === "location", formRef, locationPanelRef);

  const hasFilters = Boolean(weddingDate || searchLocation);

  const applySearch = () => {
    if (hasUnconfirmedLocationInput) {
      setLocationSelectionError("Bitte einen Ort aus den Vorschlägen auswählen.");
      setOpenDropdown("location");
      return;
    }

    // Nur aktive Filter landen als Query-Parameter in der Ziel-URL.
    const params = new URLSearchParams();

    if (weddingDate) {
      params.set("weddingDate", weddingDate);
    }

    if (searchLocation) {
      params.set("searchLocation", searchLocation);
    }

    const query = params.toString();
    router.push(query ? `/browse-artists?${query}` : "/browse-artists");
  };

  return (
    <form
      ref={formRef}
      className="relative z-40 mt-10 w-full max-w-3xl cursor-pointer overflow-visible rounded-2xl border border-white/20 bg-white text-black shadow-2xl shadow-black/30"
      onSubmit={(event) => {
        event.preventDefault();
        applySearch();
      }}
    >
      <div className="flex w-full flex-col lg:flex-row">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpenDropdown((current) => (current === "weddingDate" ? null : "weddingDate"))}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border-b border-black/10 px-4 py-4 text-sm font-medium transition hover:bg-black/10 sm:px-6 lg:border-b-0 lg:border-r"
          >
            {weddingDate ? formatDateForDisplay(weddingDate) : "Hochzeitsdatum"} <span aria-hidden="true">▼</span>
          </button>

          {openDropdown === "weddingDate" ? (
            <div
              ref={weddingDatePanelRef}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-[120] w-[min(24rem,92vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
            >
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">Datum auswählen</div>

            <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-black/15 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftYear(current, -1))}
                  className="h-8 cursor-pointer rounded-full border border-black/20 px-3 text-xs font-medium transition hover:bg-black hover:text-white"
                >
                  «
                </button>
                <span className="min-w-16 text-center text-sm font-semibold text-black">{calendarMonth.getFullYear()}</span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftYear(current, 1))}
                  className="h-8 cursor-pointer rounded-full border border-black/20 px-3 text-xs font-medium transition hover:bg-black hover:text-white"
                >
                  »
                </button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                  className="h-8 w-8 cursor-pointer rounded-full border border-black/20 text-sm font-semibold transition hover:bg-black hover:text-white"
                >
                  ←
                </button>
                <span className="min-w-24 text-center text-sm font-semibold text-black">
                  {calendarMonth.toLocaleDateString("de-DE", { month: "long" })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                  className="h-8 w-8 cursor-pointer rounded-full border border-black/20 text-sm font-semibold transition hover:bg-black hover:text-white"
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
              value={weddingDate ? new Date(`${weddingDate}T00:00:00`) : undefined}
              onClickDay={(date) => {
                const nextValue = normalizeDateKey(date);

                if (nextValue) {
                  setWeddingDate(nextValue);
                  setOpenDropdown(null);
                }
              }}
              tileClassName={({ date, view }) => {
                if (view !== "month") {
                  return "";
                }

                return normalizeDateKey(date) === weddingDate
                  ? "rounded-full bg-black text-white"
                  : "rounded-full hover:bg-black/10";
              }}
              className="rounded-2xl border border-black/15 p-2 [&_button]:cursor-pointer"
            />

            <div className="mt-3 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setWeddingDate("")}
                disabled={!weddingDate}
                className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Datum löschen
              </button>

              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="cursor-pointer rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
              >
                Fertig
              </button>
            </div>
            </div>
          ) : null}
        </div>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpenDropdown((current) => (current === "location" ? null : "location"))}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border-b border-black/10 px-4 py-4 text-sm font-medium transition hover:bg-black/10 sm:px-6 lg:border-b-0 lg:border-r"
          >
            {searchLocation || "Hochzeitsort"} <span aria-hidden="true">▼</span>
          </button>

          {openDropdown === "location" ? (
            <div
              ref={locationPanelRef}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-[120] w-[min(24rem,92vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
            >
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">Ort filtern</div>
            <CityAutocomplete
              value={searchLocationInput}
              onChange={(nextValue) => {
                setSearchLocationInput(nextValue);
                setLocationSelectionError("");
              }}
              onSelectSuggestion={(suggestion) => {
                setSearchLocation(suggestion.displayName);
                setSearchLocationInput(suggestion.displayName);
                setLocationSelectionError("");
                setOpenDropdown(null);
              }}
              placeholder="Ort eingeben"
              inputClassName="h-10 w-full rounded-full border border-black/35 bg-transparent px-4 text-sm outline-none placeholder:text-black/35 focus:border-black"
            />

            <p className={`mt-3 text-xs ${hasUnconfirmedLocationInput ? "text-red-600" : "text-black/50"}`}>
              {hasUnconfirmedLocationInput
                ? "Bitte einen Ort aus den Vorschlägen auswählen. Freie Eingaben werden nicht übernommen."
                : "Bitte einen Vorschlag auswählen."}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchLocation("");
                  setSearchLocationInput("");
                  setLocationSelectionError("");
                }}
                disabled={!searchLocation && !searchLocationInput}
                className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ort löschen
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchLocationInput(searchLocation);
                  setOpenDropdown(null);
                }}
                className="cursor-pointer rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
              >
                Fertig
              </button>
            </div>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          className="w-full cursor-pointer rounded-b-2xl bg-black px-6 py-4 text-sm font-medium text-white transition hover:bg-white/90 hover:text-black lg:w-auto lg:rounded-bl-none lg:rounded-br-2xl lg:rounded-tr-2xl lg:px-10"
        >
          Suchen
        </button>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setWeddingDate("");
            setSearchLocation("");
            setSearchLocationInput("");
            setLocationSelectionError("");
            setOpenDropdown(null);
          }}
          className="absolute -bottom-12 right-0 cursor-pointer rounded-full border border-white/30 px-4 py-2 text-xs text-white transition hover:bg-white/15"
        >
          Auswahl löschen
        </button>
      ) : null}

      {locationSelectionError ? (
        <p className="absolute -bottom-11 left-0 text-xs text-red-600">{locationSelectionError}</p>
      ) : null}
    </form>
  );
}
