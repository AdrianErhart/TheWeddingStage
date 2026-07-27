/**
 * Wiederverwendbare UI-Komponente `booking-datetime-picker`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";

function normalizeDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

type DatePickerFieldProps = {
  hint: string;
  value: string;
  onChange: (nextValue: string) => void;
};

type TimePickerFieldProps = {
  hint: string;
  value: string;
  onChange: (nextValue: string) => void;
};

export function DatePickerField({ hint, value, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => toMonthStart(today));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-full cursor-pointer items-center justify-between rounded-full border border-black/45 bg-transparent px-6 text-left text-lg transition hover:border-black"
      >
        <span className={value ? "text-black" : "text-black/35"}>{value ? formatDateForDisplay(value) : hint}</span>
        <span aria-hidden="true" className="text-base text-black/55">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(24rem,92vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10">
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
            onChange={(nextValue) => {
              const selectedDate = nextValue instanceof Date ? nextValue : null;

              if (!selectedDate) {
                return;
              }

              onChange(normalizeDateKey(selectedDate));
              setCalendarMonth(toMonthStart(selectedDate));
              setOpen(false);
            }}
            tileClassName={({ date, view }) => {
              if (view !== "month") {
                return "";
              }

              return value === normalizeDateKey(date)
                ? "rounded-full bg-black text-white"
                : "rounded-full hover:bg-black/10";
            }}
            className="rounded-2xl border border-black/15 p-2 [&_button]:cursor-pointer"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={!value}
              className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Datum löschen
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
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

export function TimePickerField({ hint, value, onChange }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-full cursor-pointer items-center justify-between rounded-full border border-black/45 bg-transparent px-6 text-left text-lg transition hover:border-black"
      >
        <span className={value ? "text-black" : "text-black/35"}>{value || hint}</span>
        <span aria-hidden="true" className="text-base text-black/55">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(18rem,86vw)] rounded-[1.5rem] border border-black/15 bg-white p-3 shadow-xl shadow-black/10">
          <div className="max-h-64 space-y-1 overflow-auto">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm transition hover:bg-black/5 ${
                  value === option ? "bg-black/5 font-semibold text-black" : "text-black/80"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={!value}
              className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-xs text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Uhrzeit löschen
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
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