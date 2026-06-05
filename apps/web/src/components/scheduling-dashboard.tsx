"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mockSchedulingData } from "@/scheduling/mock-data";
import { CalendarView } from "@/components/calendar/calendar-view";
import type {
  CalendarMovePayload,
  CalendarResizePayload,
} from "@/components/calendar/calendar-view";
import { EventSheet } from "@/components/calendar/event-sheet";
import { deserializeSchedulingData } from "@/scheduling";
import {
  deserializeAcceptedEvents,
  serializeAcceptedEvents,
} from "@/scheduling/persistence";
import type {
  AcceptSuggestionRequest,
  CalendarEvent,
  SchedulingData,
  SerializedCalendarEvent,
  SerializedSchedulingData,
  UpdateCalendarEventRequest,
} from "@/scheduling";

const acceptedEventsStorageKey = "scheduling-app.accepted-events";
const initialAnchorDate = new Date("2026-06-08T00:00:00");

export function SchedulingDashboard() {
  const [schedulingData, setSchedulingData] =
    useState<SchedulingData>(mockSchedulingData);
  const [dataSource, setDataSource] = useState<"loading" | "database" | "local">(
    "loading",
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [persistedAcceptedEvents, setPersistedAcceptedEvents] = useState<
    CalendarEvent[]
  >(() => {
    if (typeof window === "undefined") {
      return [];
    }
    return deserializeAcceptedEvents(
      window.localStorage.getItem(acceptedEventsStorageKey),
    );
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitialRange, setSheetInitialRange] = useState<
    { start: Date; end: Date } | undefined
  >(undefined);

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
      } catch {
        if (!isCurrent) {
          return;
        }

        setDataSource("local");
        setDataError("Using local demo data until PostgreSQL is available.");
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
    dataSource === "database" ? schedulingData : localSchedulingData;
  const teamMembers = activeSchedulingData.teamMembers;
  const participantAvailability = activeSchedulingData.participantAvailability;
  const rooms = activeSchedulingData.rooms;

  const acceptedEvents = useMemo(() => {
    return [...activeSchedulingData.calendarEvents].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
  }, [activeSchedulingData.calendarEvents]);

  useEffect(() => {
    if (dataSource !== "database") {
      window.localStorage.setItem(
        acceptedEventsStorageKey,
        serializeAcceptedEvents(persistedAcceptedEvents),
      );
    }
  }, [dataSource, persistedAcceptedEvents]);

  const openSheetForNew = useCallback(() => {
    setSheetInitialRange(undefined);
    setSheetOpen(true);
  }, []);

  const handleRangeCreate = useCallback(
    (range: { start: Date; end: Date }) => {
      setSheetInitialRange(range);
      setSheetOpen(true);
    },
    [],
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetInitialRange(undefined);
  }, []);

  async function submitNewEvent(request: AcceptSuggestionRequest) {
    if (dataSource === "database") {
      const response = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error("Termin konnte nicht gespeichert werden.");
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
        throw new Error("Update konnte nicht gespeichert werden.");
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

  async function handleEventMove({ event, start, end }: CalendarMovePayload) {
    if (event.source !== "accepted") {
      setDataError("Seed-Termine sind im Demo-Modus nicht verschiebbar.");
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

  async function handleEventResize({ event, end }: CalendarResizePayload) {
    if (event.source !== "accepted") {
      setDataError("Seed-Termine sind im Demo-Modus nicht resizebar.");
      return;
    }
    setDataError(null);
    try {
      await persistEventUpdate(event, {
        start: event.start.toISOString(),
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

  async function resetDemoData() {
    setIsResetting(true);
    setDataError(null);

    if (dataSource === "database") {
      try {
        const response = await fetch("/api/scheduling-data", {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Database reset failed.");
        }

        const payload = (await response.json()) as SerializedSchedulingData;
        setSchedulingData(deserializeSchedulingData(payload));
      } catch {
        setDataError("Could not reset accepted PostgreSQL events.");
      } finally {
        setIsResetting(false);
      }

      return;
    }

    try {
      setPersistedAcceptedEvents([]);
      window.localStorage.removeItem(acceptedEventsStorageKey);
    } finally {
      setIsResetting(false);
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
              Termin hinzufügen
            </button>
            <button
              className="h-10 rounded-md border border-[#cfd6e0] bg-white px-4 text-sm font-semibold text-[#253247]"
              disabled={isResetting}
              onClick={resetDemoData}
              type="button"
            >
              {isResetting ? "Resetting" : "Reset demo data"}
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
          rooms={rooms}
          teamMembers={teamMembers}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          onRangeCreate={handleRangeCreate}
        />
      </div>

      {sheetOpen ? (
        <EventSheet
          existingEvents={acceptedEvents}
          initialRange={sheetInitialRange}
          onClose={closeSheet}
          onSubmit={submitNewEvent}
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
