/**
 * Feature-Modul fuer die Uebersicht eigener Anfragen.
 * Hier werden Buchungsanfragen geladen, aufbereitet und inklusive Statusdarstellung sowie zugehoeriger Aktionen gerendert.
 */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RequestStatus = "pending" | "accepted" | "declined";

type RequestListItem = {
  id: string;
  counterpartName: string;
  counterpartLabel: string;
  status: RequestStatus;
  artistId: string;
  reviewHref: string;
  canWriteReview: boolean;
  reviewWritten: boolean;
  createdAtLabel: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    street: string;
    zip: string;
    city: string;
  };
  event: {
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
  };
  modules: string[];
  additionalInfo: string;
};

type RequestsViewProps = {
  role: "artist" | "customer";
  initialRequests: RequestListItem[];
};

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "border-amber-300 bg-amber-100 text-amber-900",
  accepted: "border-emerald-500/20 bg-emerald-50 text-emerald-900",
  declined: "border-rose-300 bg-rose-100 text-rose-900",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Ausstehend",
  accepted: "Angenommen",
  declined: "Abgelehnt",
};

export function RequestsView({ role, initialRequests }: RequestsViewProps) {
  const [requests, setRequests] = useState<RequestListItem[]>(initialRequests);
  const [expandedId, setExpandedId] = useState<string | null>(initialRequests[0]?.id ?? null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [decisionPickerId, setDecisionPickerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emptyMessage =
    role === "artist"
      ? "Du hast aktuell keine eingegangenen Anfragen."
      : "Du hast aktuell keine gesendeten Anfragen.";

  const sortedRequests = useMemo(() => requests, [requests]);

  const applyDecision = async (requestId: string, decision: "accepted" | "declined") => {
    setUpdatingId(requestId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/booking-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Die Anfrage konnte nicht aktualisiert werden.");
        return;
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === requestId ? { ...item, status: decision === "accepted" ? "accepted" : "declined" } : item
        )
      );
      window.dispatchEvent(new Event("booking-requests-updated"));
      setDecisionPickerId(null);
    } catch {
      setErrorMessage("Die Anfrage konnte nicht aktualisiert werden.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (sortedRequests.length === 0) {
    return (
      <div className="mt-8 rounded-[28px] border border-black/12 bg-white p-8 text-black/65 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      {sortedRequests.map((request) => {
        const isExpanded = expandedId === request.id;
        const isPending = request.status === "pending";
        const isAccepted = request.status === "accepted";
        const isDeclined = request.status === "declined";
        const isUpdating = updatingId === request.id;
        const isEditingDecision = decisionPickerId === request.id;

        return (
          <article key={request.id} className="overflow-hidden rounded-[26px] border border-black/12 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId((current) => (current === request.id ? null : request.id))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExpandedId((current) => (current === request.id ? null : request.id));
                }
              }}
              className="flex cursor-pointer flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0 text-left">
                <p className="truncate text-base font-semibold text-black sm:text-lg">{request.counterpartName}</p>
                <p className="mt-1 text-sm text-black/55">Anfrage vom {request.createdAtLabel}</p>
              </div>

              <div className="flex items-center justify-end gap-2 sm:shrink-0">
                {role === "customer" ? (
                  <>
                    {request.canWriteReview && request.reviewHref ? (
                      <Link
                        href={request.reviewHref}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-black bg-black px-4 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                      >
                        Rezension schreiben
                      </Link>
                    ) : null}
                    <span className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold ${STATUS_STYLES[request.status]}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                    {request.status === "accepted" && request.reviewWritten ? (
                      <span className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900">
                        Rezension geschrieben
                      </span>
                    ) : null}
                  </>
                ) : null}

                {role === "artist" ? (
                  <>
                    {isPending || isEditingDecision ? (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void applyDecision(request.id, "declined");
                          }}
                          disabled={isUpdating}
                          className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isDeclined
                              ? "border-black bg-white text-black"
                              : "border-black bg-white text-black hover:bg-black hover:text-white"
                          }`}
                        >
                          Ablehnen
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void applyDecision(request.id, "accepted");
                          }}
                          disabled={isUpdating}
                          className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isAccepted
                              ? "border-black bg-black text-white"
                              : "border-black bg-black text-white hover:bg-white hover:text-black"
                          }`}
                        >
                          Annehmen
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold ${STATUS_STYLES[request.status]}`}>
                          {STATUS_LABELS[request.status]}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDecisionPickerId(request.id);
                          }}
                          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-black/25 px-4 text-sm font-semibold text-black transition hover:border-black hover:bg-black/5"
                        >
                          Ändern
                        </button>
                      </>
                    )}
                  </>
                ) : null}

                <span className="text-sm text-black/50" aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-black/10 px-5 pb-5 pt-4 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2 text-sm text-black/75">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Kontaktdaten</p>
                    <p>{request.contact.name}</p>
                    <p>{request.contact.email}</p>
                    <p>{request.contact.street}</p>
                    <p>{request.contact.zip} {request.contact.city}</p>
                    <p>{request.contact.phone}</p>

                    <div className="pt-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Gewählte Module</p>
                      <p>{request.modules.length > 0 ? request.modules.join(", ") : "-"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-black/75">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Veranstaltung</p>
                    <p>Start: {request.event.startDate} {request.event.startTime}</p>
                    <p>Ende: {request.event.endDate} {request.event.endTime}</p>
                    <p>Location-Name: {request.event.locationName || "-"}</p>
                    <p>Location: {request.event.locationStreet}, {request.event.locationZip} {request.event.locationCity}</p>
                    <p>Hochzeitsplaner: {request.event.plannerEmail || "-"}</p>
                    <p>Location-Mail: {request.event.venueEmail || "-"}</p>
                    <p>Geschätztes Budget: {request.event.estimatedBudget || "-"}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 text-sm text-black/75">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Zusatzinformationen</p>
                  <p className="whitespace-pre-line">{request.additionalInfo || "-"}</p>
                </div>

              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
