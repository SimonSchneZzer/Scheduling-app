"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mockSchedulingData } from "@/scheduling/mock-data";
import { CalendarView } from "@/components/calendar/calendar-view";
import type {
  CalendarMovePayload,
  CalendarResizePayload,
} from "@/components/calendar/calendar-view";
import {
  EventSheet,
  type EventDraftPreview,
} from "@/components/calendar/event-sheet";
import {
  deserializeScheduleRunHistory,
  deserializeScheduleRunResponse,
  deserializeSchedulingData,
} from "@/scheduling";
import {
  deserializeAcceptedEvents,
  serializeAcceptedEvents,
} from "@/scheduling/persistence";
import type {
  AcceptSuggestionRequest,
  CalendarEvent,
  CreateScheduleRunRequest,
  SchedulingData,
  SerializedCalendarEvent,
  SerializedScheduleRunResponse,
  SerializedSchedulingData,
  ScheduleSuggestion,
  ScheduleRunHistoryItem,
  StoredScheduleSuggestion,
  SerializedScheduleRunHistoryItem,
  UpdateCalendarEventRequest,
} from "@/scheduling";

const acceptedEventsStorageKey = "scheduling-app.accepted-events";
const initialAnchorDate = new Date("2026-06-08T00:00:00");

function createDefaultEventRange() {
  return {
    start: new Date("2026-06-08T15:30:00"),
    end: new Date("2026-06-08T16:15:00"),
  };
}

export function SchedulingDashboard() {
  const [schedulingData, setSchedulingData] =
    useState<SchedulingData>(mockSchedulingData);
  const [dataSource, setDataSource] = useState<"loading" | "database" | "local">(
    "loading",
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [persistedAcceptedEvents, setPersistedAcceptedEvents] = useState<
    CalendarEvent[]
  >([]);
  const [localStorageLoaded, setLocalStorageLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitialRange, setSheetInitialRange] = useState<
    { start: Date; end: Date } | undefined
  >(undefined);
  const [sheetEditEvent, setSheetEditEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [draftPreviewEvent, setDraftPreviewEvent] =
    useState<CalendarEvent | null>(null);
  const [pendingSuggestionEvents, setPendingSuggestionEvents] = useState<
    CalendarEvent[]
  >([]);
  const [scheduleRunHistory, setScheduleRunHistory] = useState<
    ScheduleRunHistoryItem[]
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPersistedAcceptedEvents(
        deserializeAcceptedEvents(
          window.localStorage.getItem(acceptedEventsStorageKey),
        ),
      );
      setLocalStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadDatabaseData() {
      try {
        const response = await fetch("/api/scheduling-data", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Database data is unavailable.");
        }

        const payload = (await response.json()) as SerializedSchedulingData;
        const nextData = deserializeSchedulingData(payload);

        if (!isCurrent) {
          return;
        }

        setSchedulingData(nextData);
        setDataSource("database");
        setDataError(null);
        void refreshScheduleRunHistory();
      } catch {
        if (!isCurrent) {
          return;
        }

        setDataSource("local");
        setDataError("Using local demo data until PostgreSQL is available.");
        setScheduleRunHistory([]);
      }
    }

    loadDatabaseData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const localSchedulingData = useMemo<SchedulingData>(() => {
    return {
      ...mockSchedulingData,
      calendarEvents: [
        ...mockSchedulingData.calendarEvents.filter(
          (event) =>
            !persistedAcceptedEvents.some(
              (override) => override.id === event.id,
            ),
        ),
        ...persistedAcceptedEvents,
      ].sort((a, b) => a.start.getTime() - b.start.getTime()),
    };
  }, [persistedAcceptedEvents]);

  const activeSchedulingData =
    dataSource === "local" ? localSchedulingData : schedulingData;
  const teamMembers = activeSchedulingData.teamMembers;
  const participantAvailability = activeSchedulingData.participantAvailability;
  const rooms = activeSchedulingData.rooms;

  const acceptedEvents = useMemo(() => {
    return [...activeSchedulingData.calendarEvents].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
  }, [activeSchedulingData.calendarEvents]);

  useEffect(() => {
    if (dataSource !== "database" && localStorageLoaded) {
      window.localStorage.setItem(
        acceptedEventsStorageKey,
        serializeAcceptedEvents(persistedAcceptedEvents),
      );
    }
  }, [dataSource, localStorageLoaded, persistedAcceptedEvents]);

  const openSheetForNew = useCallback(() => {
    setSheetEditEvent(null);
    setSheetInitialRange(createDefaultEventRange());
    setSheetOpen(true);
  }, []);

  const handleRangeCreate = useCallback(
    (range: { start: Date; end: Date }) => {
      setSheetEditEvent(null);
      setSheetInitialRange(range);
      setSheetOpen(true);
    },
    [],
  );

  const openSheetForEvent = useCallback((event: CalendarEvent) => {
    setSheetEditEvent(event);
    setSheetInitialRange(undefined);
    setSheetOpen(true);
  }, []);

  // Stable identity: the sheet's draft-preview effect depends on this, so an
  // inline function would re-run the effect every render and loop.
  const handleDraftChange = useCallback((draft: EventDraftPreview | null) => {
    setDraftPreviewEvent(
      draft
        ? {
            id: draft.id,
            title: draft.title,
            source: "accepted",
            preview: true,
            participantIds: [],
            resourceId: draft.resourceId,
            start: draft.start,
            end: draft.end,
          }
        : null,
    );
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetInitialRange(undefined);
    setSheetEditEvent(null);
    setDraftPreviewEvent(null);
    setPendingSuggestionEvents([]);
  }, []);

  async function refreshScheduleRunHistory() {
    try {
      const response = await fetch("/api/schedule-runs", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Schedule run history unavailable.");
      }
      setScheduleRunHistory(
        deserializeScheduleRunHistory(
          (await response.json()) as SerializedScheduleRunHistoryItem[],
        ),
      );
    } catch {
      setScheduleRunHistory([]);
    }
  }

  async function submitNewEvent(request: AcceptSuggestionRequest) {
    if (dataSource === "database") {
      const response = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(await calendarEventApiError(response));
      }

      const event = deserializeCalendarEvent(
        (await response.json()) as SerializedCalendarEvent,
      );

      setSchedulingData((current) => ({
        ...current,
        calendarEvents: [...current.calendarEvents, event].sort(
          (a, b) => a.start.getTime() - b.start.getTime(),
        ),
      }));
      return;
    }

    const acceptedEvent: CalendarEvent = {
      id: `accepted-${request.start}-${persistedAcceptedEvents.length + 1}`,
      title: request.title,
      description: request.description,
      source: "accepted",
      participantIds: request.participantIds,
      resourceId: request.resourceId,
      start: new Date(request.start),
      end: new Date(request.end),
    };

    setPersistedAcceptedEvents((events) =>
      [...events, acceptedEvent].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    );
  }

  async function createStoredScheduleRun(
    request: CreateScheduleRunRequest,
  ): Promise<StoredScheduleSuggestion[]> {
    const response = await fetch("/api/schedule-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await calendarEventApiError(response));
    }

    const run = deserializeScheduleRunResponse(
      (await response.json()) as SerializedScheduleRunResponse,
    );

    void refreshScheduleRunHistory();
    return run.suggestions;
  }

  function previewSuggestions(
    request: CreateScheduleRunRequest,
    suggestions: ScheduleSuggestion[],
  ) {
    setPendingSuggestionEvents(
      suggestions.map((suggestion, index) => ({
        id: `suggestion-${suggestion.start.toISOString()}-${index}`,
        title: `${request.title} · Suggestion ${index + 1}`,
        source: "accepted",
        preview: true,
        participantIds: request.eventRequest.participants.map(
          (participant) => participant.id,
        ),
        resourceId: suggestion.assignedResource?.id,
        start: suggestion.start,
        end: suggestion.end,
      })),
    );
  }

  async function acceptStoredSuggestion(suggestion: StoredScheduleSuggestion) {
    const response = await fetch(
      `/api/schedule-suggestions/${suggestion.id}/accept`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(await calendarEventApiError(response));
    }

    const event = deserializeCalendarEvent(
      (await response.json()) as SerializedCalendarEvent,
    );

    setSchedulingData((current) => ({
      ...current,
      calendarEvents: [...current.calendarEvents, event].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    }));
    setPendingSuggestionEvents([]);
    void refreshScheduleRunHistory();
  }

  async function persistEventUpdate(
    target: CalendarEvent,
    patch: UpdateCalendarEventRequest,
  ): Promise<CalendarEvent> {
    if (dataSource === "database") {
      const response = await fetch(`/api/calendar-events/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error(await calendarEventApiError(response));
      }

      const updated = deserializeCalendarEvent(
        (await response.json()) as SerializedCalendarEvent,
      );

      setSchedulingData((current) => ({
        ...current,
        calendarEvents: current.calendarEvents
          .map((event) => (event.id === updated.id ? updated : event))
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      }));

      return updated;
    }

    const updated: CalendarEvent = {
      ...target,
      start: new Date(patch.start),
      end: new Date(patch.end),
      resourceId:
        patch.resourceId === undefined
          ? target.resourceId
          : patch.resourceId ?? undefined,
      title: patch.title ?? target.title,
      description:
        patch.description === undefined
          ? target.description
          : patch.description ?? undefined,
    };

    setPersistedAcceptedEvents((events) => {
      const exists = events.some((event) => event.id === updated.id);
      const next = exists
        ? events.map((event) => (event.id === updated.id ? updated : event))
        : [...events, updated];
      return next.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return updated;
  }

  async function deleteEvent(target: CalendarEvent) {
    if (target.preview) {
      setDataError("Suggestion previews cannot be deleted.");
      return;
    }

    setDataError(null);

    if (dataSource === "database") {
      try {
        const response = await fetch(`/api/calendar-events/${target.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(await calendarEventApiError(response));
        }

        setSchedulingData((current) => ({
          ...current,
          calendarEvents: current.calendarEvents.filter(
            (event) => event.id !== target.id,
          ),
        }));
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Termin konnte nicht gelöscht werden.",
        );
      }
      return;
    }

    setPersistedAcceptedEvents((events) =>
      events.filter((event) => event.id !== target.id),
    );
  }

  async function handleEventMove({ event, start, end }: CalendarMovePayload) {
    if (event.preview) {
      setDataError("Suggestion previews cannot be moved.");
      return;
    }
    setDataError(null);
    try {
      await persistEventUpdate(event, {
        start: start.toISOString(),
        end: end.toISOString(),
      });
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : "Update konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleEventResize({ event, start, end }: CalendarResizePayload) {
    if (event.preview) {
      setDataError("Suggestion previews cannot be resized.");
      return;
    }
    setDataError(null);
    try {
      await persistEventUpdate(event, {
        start: (start ?? event.start).toISOString(),
        end: end.toISOString(),
      });
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : "Update konnte nicht gespeichert werden.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#1d2430]">
      <header className="border-b border-[#d9dee7] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#4d6b5f]">Scheduling App</p>
            <h1 className="text-2xl font-semibold">Team calendar planning</h1>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <button
              className="h-10 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white"
              onClick={openSheetForNew}
              type="button"
            >
              Add event
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-5">
        {dataSource === "loading" || dataError ? (
          <div className="rounded-md border border-[#d9dee7] bg-white px-4 py-3 text-sm text-[#687385]">
            {dataSource === "loading"
              ? "Loading PostgreSQL scheduling data..."
              : dataError}
          </div>
        ) : null}

        <CalendarView
          events={acceptedEvents}
          initialDate={initialAnchorDate}
          activeEventId={sheetEditEvent?.id ?? null}
          suggestionEvents={
            draftPreviewEvent
              ? [...pendingSuggestionEvents, draftPreviewEvent]
              : pendingSuggestionEvents
          }
          rooms={rooms}
          teamMembers={teamMembers}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          onEventOpen={openSheetForEvent}
          onRangeCreate={handleRangeCreate}
        />

        <ScheduleRunHistoryPanel
          dataSource={dataSource}
          runs={scheduleRunHistory}
        />
      </div>

      {sheetOpen ? (
        <EventSheet
          event={sheetEditEvent ?? undefined}
          existingEvents={acceptedEvents}
          initialRange={sheetInitialRange}
          onClose={closeSheet}
          onAcceptSuggestion={
            dataSource === "database" ? acceptStoredSuggestion : undefined
          }
          onFindSuggestions={
            dataSource === "database" ? createStoredScheduleRun : undefined
          }
          onSuggestionsPreview={previewSuggestions}
          onSubmit={submitNewEvent}
          onUpdate={async (id, patch) => {
            const target =
              sheetEditEvent ??
              acceptedEvents.find((candidate) => candidate.id === id);
            if (!target) {
              return;
            }
            await persistEventUpdate(target, patch);
          }}
          onDelete={deleteEvent}
          onDraftChange={handleDraftChange}
          participantAvailability={participantAvailability}
          rooms={rooms}
          teamMembers={teamMembers}
        />
      ) : null}
    </main>
  );
}

function deserializeCalendarEvent(event: SerializedCalendarEvent): CalendarEvent {
  return {
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  };
}

async function calendarEventApiError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: unknown;
      reasons?: unknown;
    };
    const reasons = Array.isArray(payload.reasons)
      ? payload.reasons.filter((reason): reason is string => typeof reason === "string")
      : [];

    if (reasons.length > 0) {
      return reasons.join(" ");
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to the status-based default.
  }

  return `Kalender-Update fehlgeschlagen (${response.status}).`;
}

function ScheduleRunHistoryPanel({
  dataSource,
  runs,
}: {
  dataSource: "loading" | "database" | "local";
  runs: ScheduleRunHistoryItem[];
}) {
  return (
    <section className="rounded-lg border border-[#d9dee7] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Schedule run history</h2>
          <p className="text-sm text-[#687385]">
            Gespeicherte Anfragen, Runs und akzeptierte Vorschläge.
          </p>
        </div>
        <span className="rounded bg-[#eef1f5] px-2 py-1 text-xs font-medium text-[#3c4656]">
          {dataSource === "database" ? "PostgreSQL" : "Demo"}
        </span>
      </div>

      {dataSource !== "database" ? (
        <p className="mt-3 rounded-md border border-dashed border-[#cfd6e0] p-3 text-sm text-[#687385]">
          History ist verfügbar, sobald PostgreSQL geladen ist.
        </p>
      ) : runs.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[#cfd6e0] p-3 text-sm text-[#687385]">
          Noch keine gespeicherten Schedule Runs.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {runs.map((run) => (
            <div
              className="grid gap-2 rounded-md border border-[#e3e8ef] px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto]"
              key={run.id}
            >
              <div>
                <p className="font-semibold text-[#253247]">{run.title}</p>
                <p className="text-xs text-[#687385]">
                  {formatRunDate(run.createdAt)} · {run.suggestionCount}{" "}
                  {run.suggestionCount === 1 ? "Vorschlag" : "Vorschläge"}
                </p>
              </div>
              <span className="self-center rounded bg-[#253247] px-2 py-1 text-xs font-semibold text-white">
                Top {run.topScore ?? "-"}
              </span>
              <span
                className={`self-center rounded px-2 py-1 text-xs font-semibold ${
                  run.acceptedEventId
                    ? "bg-[#e8f3ee] text-[#1f6f5b]"
                    : "bg-[#fff7e6] text-[#7a4a08]"
                }`}
              >
                {run.acceptedEventId ? "Accepted" : "Open"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatRunDate(date: Date) {
  return new Intl.DateTimeFormat("de", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
