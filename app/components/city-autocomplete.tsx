/**
 * Wiederverwendbare UI-Komponente `city-autocomplete`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import { useEffect, useRef, useState } from "react";

import type { CitySuggestion } from "@/lib/geocoding";

type CityAutocompleteProps = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
  onSelectSuggestion: (suggestion: CitySuggestion) => void;
  inputClassName?: string;
};

export function CityAutocomplete({
  value,
  placeholder,
  disabled = false,
  onChange,
  onSelectSuggestion,
  inputClassName = "",
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2 || disabled || !hasUserInteracted) {
      return;
    }

    // Fortlaufende ID verhindert, dass spaete Antworten aelterer Requests den aktuellen Stand ueberschreiben.
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    // Kurzes Debouncing reduziert API-Aufrufe waehrend schneller Eingaben.
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch(`/api/location-suggestions?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { suggestions?: CitySuggestion[] };

        if (requestIdRef.current !== requestId) {
          // Veraltete Antwort ignorieren.
          return;
        }

        const nextSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(nextSuggestions);
        setOpen(nextSuggestions.length > 0 && hasUserInteracted);
      } catch {
        if (requestIdRef.current === requestId) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [disabled, hasUserInteracted, value]);

  return (
    <div className="relative min-w-0">
      <input
        type="text"
        value={value}
        onChange={(event) => {
          setHasUserInteracted(true);
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setHasUserInteracted(true);
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          // Verzoegertes Schliessen erlaubt Klicks auf Vorschlaege trotz Blur-Event.
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={inputClassName}
      />

      {loading && value.trim().length >= 2 && !disabled && hasUserInteracted ? (
        <p className="mt-2 text-sm text-black/60">Vorschläge werden geladen...</p>
      ) : null}

      {open && value.trim().length >= 2 && !disabled && hasUserInteracted && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[1.5rem] border border-black/15 bg-white p-2 shadow-xl shadow-black/10">
          <div className="max-h-64 overflow-auto text-left text-sm text-black/80">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.displayName}:${suggestion.lat}:${suggestion.lng}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelectSuggestion(suggestion);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer flex-col items-start rounded-xl px-3 py-2 text-left transition hover:bg-black/5"
              >
                <span className="font-medium text-black">{suggestion.displayName.split(",")[0] ?? suggestion.displayName}</span>
                <span className="text-xs text-black/50">{suggestion.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}