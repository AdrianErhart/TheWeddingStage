/**
 * Feature-Modul fuer die Kuenstlersuche und -liste.
 * Enthaelt Logik fuer Filter, URL-/Local-Storage-Synchronisation und die Darstellung von Ergebnissen inklusive Interaktionen.
 */
"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Calendar from "react-calendar";

import { CityAutocomplete } from "../components/city-autocomplete";
import { buildBrowseArtistsStorageKeys } from "./browse-artists-storage";

const GENRE_OPTIONS = ["Pop", "Rock", "Jazz", "EDM", "Acoustic", "Metal", "Hip-Hop", "Classical", "R&B", "Country"];
const INSTRUMENT_OPTIONS = ["Gesang", "Gitarre", "Klavier", "Drums", "Bass", "Saxophon", "Violine", "Cello", "Keyboard", "Trompete"];
const BAND_SIZE_OPTIONS = ["Solo", "2 Personen", "3 Personen", "4 oder mehr Personen"];
const MUSIC_ACCOMPANIMENT_OPTIONS = ["Standesamt", "Kirchliche Trauung", "Freie Trauung", "Sektempfang", "Afterparty"];
type FilterState = {
  genre: string[];
  bandSize: string[];
  instrument: string[];
  accompaniment: string[];
  searchLocation: string;
  weddingDate: string;
};

type ArtistFiltersProps = {
  initialFilters: FilterState;
  storageScope: string;
};

function useDropdownOverflowShift(open: boolean, boundaryRef: RefObject<HTMLDivElement | null>) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    if (!open) {
      panel.style.transform = "";
      return;
    }

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
  }, [boundaryRef, open]);

  return panelRef;
}

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

function parseListParam(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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

function FilterDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
  open,
  onOpenChange,
  onCloseAll,
  onApply,
  boundaryRef,
}: {
  label: string;
  value: string[];
  placeholder: string;
  options: string[];
  onChange: (nextValue: string[]) => void;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onCloseAll: () => void;
  onApply: () => void;
  boundaryRef: RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useDropdownOverflowShift(open, boundaryRef);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-black/35 bg-white px-4 text-sm text-black transition hover:bg-black hover:text-white"
      >
        <span>{label}</span>
        <span aria-hidden="true">▼</span>
        {value.length > 0 ? (
          <span className="ml-1 inline-flex min-w-8 items-center justify-center rounded-full bg-black px-3 text-[11px] font-semibold text-white">
            {value.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(22rem,90vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
        >
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">{placeholder}</div>
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
                      onChange(checked ? value.filter((entry) => entry !== option) : [...value, option]);
                      onApply();
                    }}
                    className="h-4 w-4 cursor-pointer accent-black"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onCloseAll}
              className="cursor-pointer rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
            >
              Fertig
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SingleDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
  open,
  onOpenChange,
  onCloseAll,
  onApply,
  boundaryRef,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (nextValue: string) => void;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onCloseAll: () => void;
  onApply: () => void;
  boundaryRef: RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useDropdownOverflowShift(open, boundaryRef);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-black/35 bg-white px-4 text-sm text-black transition hover:bg-black hover:text-white"
      >
        <span>{label}</span>
        <span aria-hidden="true">▼</span>
        {value ? (
          <span className="ml-1 inline-flex min-w-8 items-center justify-center rounded-full bg-black px-3 text-[11px] font-semibold text-white">
            1
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(18rem,90vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
        >
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">{placeholder}</div>
          <div className="max-h-64 space-y-1 overflow-auto text-left text-sm text-black/80">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  onApply();
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-black/5 ${
                  value === option ? "bg-black/5 text-black" : ""
                }`}
              >
                <span>{option}</span>
                {value === option ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onCloseAll}
              className="cursor-pointer rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
            >
              Fertig
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocationDropdown({
  label,
  value,
  inputValue,
  placeholder,
  hasUnconfirmedInput,
  open,
  onOpenChange,
  onCloseAll,
  onChange,
  onSelect,
  onClear,
  boundaryRef,
}: {
  label: string;
  value: string;
  inputValue: string;
  placeholder: string;
  hasUnconfirmedInput: boolean;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onCloseAll: () => void;
  onChange: (nextValue: string) => void;
  onSelect: (nextValue: string) => void;
  onClear: () => void;
  boundaryRef: RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useDropdownOverflowShift(open, boundaryRef);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-black/35 bg-white px-4 text-sm text-black transition hover:bg-black hover:text-white"
      >
        <span>{label}</span>
        <span aria-hidden="true">▼</span>
        {value ? (
          <span className="ml-1 inline-flex min-w-8 items-center justify-center rounded-full bg-black px-3 text-[11px] font-semibold text-white">
            1
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(24rem,90vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
        >
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">{placeholder}</div>
          <CityAutocomplete
            value={inputValue}
            onChange={onChange}
            onSelectSuggestion={(suggestion) => {
              onSelect(suggestion.displayName);
              onCloseAll();
            }}
            placeholder="Ort eingeben"
            inputClassName="h-10 w-full rounded-full border border-black/35 bg-transparent px-4 text-sm outline-none placeholder:text-black/35 focus:border-black"
          />

          <p className={`mt-3 text-xs ${hasUnconfirmedInput ? "text-red-600" : "text-black/50"}`}>
            {hasUnconfirmedInput
              ? "Bitte einen Ort aus den Vorschlägen auswählen. Freie Eingaben werden nicht übernommen."
              : "Bitte einen Vorschlag auswählen."}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClear}
              disabled={!value}
              className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ort löschen
            </button>

            <button
              type="button"
              onClick={onCloseAll}
              className="cursor-pointer rounded-full border border-black px-4 py-2 text-xs transition hover:bg-black hover:text-white"
            >
              Fertig
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateDropdown({
  label,
  value,
  placeholder,
  open,
  onOpenChange,
  onCloseAll,
  onChange,
  onClear,
  boundaryRef,
}: {
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onCloseAll: () => void;
  onChange: (nextValue: string) => void;
  onClear: () => void;
  boundaryRef: RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useDropdownOverflowShift(open, boundaryRef);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    if (value) {
      const [year, month] = value.split("-").map((entry) => Number(entry));

      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }

    return toMonthStart(today);
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 items-center gap-2 rounded-full border border-black/35 bg-white px-4 text-sm text-black transition hover:bg-black hover:text-white"
      >
        <span>{value ? formatDateForDisplay(value) : label}</span>
        <span aria-hidden="true">▼</span>
        {value ? (
          <span className="ml-1 inline-flex min-w-8 items-center justify-center rounded-full bg-black px-3 text-[11px] font-semibold text-white">
            1
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(24rem,92vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10"
        >
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">{placeholder}</div>

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
            value={value ? new Date(`${value}T00:00:00`) : undefined}
            onClickDay={(date) => {
              const nextValue = normalizeDateKey(date);

              if (nextValue) {
                onChange(nextValue);
                onCloseAll();
              }
            }}
            tileClassName={({ date, view }) => {
              if (view !== "month") {
                return "";
              }

              return normalizeDateKey(date) === value
                ? "rounded-full bg-black text-white"
                : "rounded-full hover:bg-black/10";
            }}
            className="rounded-2xl border border-black/15 p-2 [&_button]:cursor-pointer"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClear}
              disabled={!value}
              className="rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Datum löschen
            </button>

            <button
              type="button"
              onClick={onCloseAll}
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

export function ArtistFilters({ initialFilters, storageScope }: ArtistFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const { clearQueryFlagKey } = buildBrowseArtistsStorageKeys(storageScope);
  const [genre, setGenre] = useState(initialFilters.genre);
  const [bandSize, setBandSize] = useState(initialFilters.bandSize);
  const [instrument, setInstrument] = useState(initialFilters.instrument);
  const [accompaniment, setAccompaniment] = useState(initialFilters.accompaniment);
  const [searchLocation, setSearchLocation] = useState(initialFilters.searchLocation);
  const [searchLocationInput, setSearchLocationInput] = useState(initialFilters.searchLocation);
  const [weddingDate, setWeddingDate] = useState(initialFilters.weddingDate);
  const [openDropdown, setOpenDropdown] = useState<null | "genre" | "bandSize" | "instrument" | "accompaniment" | "location" | "weddingDate">(null);
  const hasUnconfirmedLocationInput = searchLocationInput.trim().length > 0 && searchLocationInput !== searchLocation;

  const activeFilterCount = useMemo(() => {
    return genre.length + bandSize.length + instrument.length + accompaniment.length + (searchLocation ? 1 : 0) + (weddingDate ? 1 : 0);
  }, [accompaniment.length, bandSize, genre.length, instrument.length, searchLocation, weddingDate]);

  const buildParams = (
    nextGenre: string[],
    nextBandSize: string[],
    nextInstrument: string[],
    nextAccompaniment: string[],
    nextSearchLocation: string = searchLocation,
    nextWeddingDate: string = weddingDate
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextGenre.length > 0) {
      params.set("genre", nextGenre.join(","));
    } else {
      params.delete("genre");
    }

    if (nextBandSize.length > 0) {
      params.set("bandSize", nextBandSize.join(","));
    } else {
      params.delete("bandSize");
    }

    if (nextInstrument.length > 0) {
      params.set("instrument", nextInstrument.join(","));
    } else {
      params.delete("instrument");
    }

    if (nextAccompaniment.length > 0) {
      params.set("accompaniment", nextAccompaniment.join(","));
    } else {
      params.delete("accompaniment");
    }

    if (nextSearchLocation) {
      params.set("searchLocation", nextSearchLocation);
    } else {
      params.delete("searchLocation");
    }

    if (nextWeddingDate) {
      params.set("weddingDate", nextWeddingDate);
    } else {
      params.delete("weddingDate");
    }

    return params;
  };

  const applyFilters = (
    nextGenre = genre,
    nextBandSize = bandSize,
    nextInstrument = instrument,
    nextAccompaniment = accompaniment,
    nextSearchLocation = searchLocation,
    nextWeddingDate = weddingDate
  ) => {
    const params = buildParams(nextGenre, nextBandSize, nextInstrument, nextAccompaniment, nextSearchLocation, nextWeddingDate);

    const hasAnyActiveFilter =
      nextGenre.length > 0
      || nextBandSize.length > 0
      || nextInstrument.length > 0
      || nextAccompaniment.length > 0
      || nextSearchLocation.trim().length > 0
      || nextWeddingDate.trim().length > 0;

    try {
      if (hasAnyActiveFilter) {
        window.sessionStorage.removeItem(clearQueryFlagKey);
      } else {
        window.sessionStorage.setItem(clearQueryFlagKey, "1");
      }
    } catch {
      // Ignore unavailable storage and keep normal filter behavior.
    }

    router.push(`/browse-artists?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    setGenre([]);
    setBandSize([]);
    setInstrument([]);
    setAccompaniment([]);
    setSearchLocation("");
    setSearchLocationInput("");
    setWeddingDate("");
    setOpenDropdown(null);

    try {
      window.sessionStorage.setItem(clearQueryFlagKey, "1");
    } catch {
      // Ignore unavailable storage and keep normal clear behavior.
    }

    router.push("/browse-artists", { scroll: false });
  };

  const closeAll = () => setOpenDropdown(null);

  const closeLocationDropdown = () => {
    setSearchLocationInput(searchLocation);
    setOpenDropdown(null);
  };

  return (
    <div className="mt-7 space-y-4">
      <div ref={filterBarRef} className="flex flex-wrap items-center gap-3 rounded-[28px] border border-black/45 bg-white px-4 py-3 shadow-sm sm:px-5">
        <DateDropdown
          label="Hochzeitsdatum"
          placeholder="Datum auswählen"
          value={weddingDate}
          open={openDropdown === "weddingDate"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "weddingDate" : null)}
          onCloseAll={closeAll}
          boundaryRef={filterBarRef}
          onChange={(nextDate) => {
            setWeddingDate(nextDate);
            applyFilters(genre, bandSize, instrument, accompaniment, searchLocation, nextDate);
          }}
          onClear={() => {
            setWeddingDate("");
            applyFilters(genre, bandSize, instrument, accompaniment, searchLocation, "");
          }}
        />

        <LocationDropdown
          label="Hochzeitsort"
          placeholder="Ort filtern"
          value={searchLocation}
          inputValue={searchLocationInput}
          hasUnconfirmedInput={hasUnconfirmedLocationInput}
          open={openDropdown === "location"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "location" : null)}
          onCloseAll={closeLocationDropdown}
          boundaryRef={filterBarRef}
          onChange={(nextLocation) => setSearchLocationInput(nextLocation)}
          onSelect={(nextLocation) => {
            setSearchLocation(nextLocation);
            setSearchLocationInput(nextLocation);
            applyFilters(genre, bandSize, instrument, accompaniment, nextLocation, weddingDate);
          }}
          onClear={() => {
            setSearchLocation("");
            setSearchLocationInput("");
            applyFilters(genre, bandSize, instrument, accompaniment, "", weddingDate);
          }}
        />

        <FilterDropdown
          label="Genre"
          placeholder="Genre auswählen"
          options={GENRE_OPTIONS}
          value={genre}
          onChange={(nextGenre) => {
            setGenre(nextGenre);
            applyFilters(nextGenre, bandSize, instrument, accompaniment, searchLocation, weddingDate);
          }}
          open={openDropdown === "genre"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "genre" : null)}
          onCloseAll={closeAll}
          onApply={() => {}}
          boundaryRef={filterBarRef}
        />
        <FilterDropdown
          label="Bandgröße"
          placeholder="Bandgröße wählen"
          options={BAND_SIZE_OPTIONS}
          value={bandSize}
          onChange={(nextBandSize) => {
            setBandSize(nextBandSize);
            applyFilters(genre, nextBandSize, instrument, accompaniment, searchLocation, weddingDate);
          }}
          open={openDropdown === "bandSize"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "bandSize" : null)}
          onCloseAll={closeAll}
          onApply={() => {}}
          boundaryRef={filterBarRef}
        />
        <FilterDropdown
          label="Instrument"
          placeholder="Instrument auswählen"
          options={INSTRUMENT_OPTIONS}
          value={instrument}
          onChange={(nextInstrument) => {
            setInstrument(nextInstrument);
            applyFilters(genre, bandSize, nextInstrument, accompaniment, searchLocation, weddingDate);
          }}
          open={openDropdown === "instrument"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "instrument" : null)}
          onCloseAll={closeAll}
          onApply={() => {}}
          boundaryRef={filterBarRef}
        />
        <FilterDropdown
          label="Rahmen"
          placeholder="Rahmen auswählen"
          options={MUSIC_ACCOMPANIMENT_OPTIONS}
          value={accompaniment}
          onChange={(nextAccompaniment) => {
            setAccompaniment(nextAccompaniment);
            applyFilters(genre, bandSize, instrument, nextAccompaniment, searchLocation, weddingDate);
          }}
          open={openDropdown === "accompaniment"}
          onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? "accompaniment" : null)}
          onCloseAll={closeAll}
          onApply={() => {}}
          boundaryRef={filterBarRef}
        />

        <button
          type="button"
          onClick={clearFilters}
          disabled={activeFilterCount === 0}
          className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/20 px-5 text-sm font-medium text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Alle Filter löschen
        </button>
      </div>

    </div>
  );
}