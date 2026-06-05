"use client";

import { useMemo, useState } from "react";
import { generateScheduleSuggestions } from "@/scheduling";
import type {
  AcceptSuggestionRequest,
  CalendarEvent,
  CreateScheduleRunRequest,
  EventMode,
  EventRequest,
  EventType,
  Participant,
  ParticipantAvailability,
  ParticipantRole,
  Priority,
  ResourceFeature,
  RoomResource,
  ScheduleSuggestion,
  StoredScheduleSuggestion,
  TeamMember,
} from "@/scheduling";

type ParticipantSelection = Record<string, ParticipantRole | "none">;

const eventTypeOptions: EventType[] = ["timed", "all-day", "multi-day"];
const priorityOptions: Priority[] = ["low", "medium", "high", "urgent"];
const featureOptions: ResourceFeature[] = ["whiteboard", "screen", "video"];

export type EventSheetProps = {
  onClose: () => void;
  teamMembers: TeamMember[];
  rooms: RoomResource[];
  participantAvailability: ParticipantAvailability[];
  existingEvents: CalendarEvent[];
  initialRange?: { start: Date; end: Date };
  onAcceptSuggestion?: (suggestion: StoredScheduleSuggestion) => Promise<void>;
  onFindSuggestions?: (
    request: CreateScheduleRunRequest,
  ) => Promise<StoredScheduleSuggestion[]>;
  onSubmit: (request: AcceptSuggestionRequest) => Promise<void>;
};

export function EventSheet({
  onClose,
  teamMembers,
  rooms,
  participantAvailability,
  existingEvents,
  initialRange,
  onAcceptSuggestion,
  onFindSuggestions,
  onSubmit,
}: EventSheetProps) {
  const initialStart = initialRange?.start;
  const initialEnd = initialRange?.end;
  const initialDurationMinutes =
    initialStart && initialEnd
      ? Math.max(15, Math.round((initialEnd.getTime() - initialStart.getTime()) / 60_000))
      : 45;

  const [title, setTitle] = useState("New event");
  const [eventType, setEventType] = useState<EventType>("timed");
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [durationDays, setDurationDays] = useState(2);
  const [priority, setPriority] = useState<Priority>("medium");
  const [eventDate, setEventDate] = useState(() =>
    toDateInput(initialStart ?? new Date()),
  );
  const [startTime, setStartTime] = useState(() =>
    initialStart ? toTimeInput(initialStart) : "09:00",
  );
  const [endTime, setEndTime] = useState(() =>
    initialEnd ? toTimeInput(initialEnd) : "09:45",
  );
  const [eventMode, setEventMode] = useState<EventMode>("offline");
  const [requiredSeats, setRequiredSeats] = useState(6);
  const [requiredFeatures, setRequiredFeatures] = useState<ResourceFeature[]>([]);
  const [participantSelection, setParticipantSelection] =
    useState<ParticipantSelection>(() => selectionFromTeamMembers(teamMembers));
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [bestSlotOpen, setBestSlotOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SheetSuggestion[]>([]);
  const [isFindingSlots, setIsFindingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedParticipants = useMemo<Participant[]>(() => {
    return teamMembers
      .map<Participant | null>((member) => {
        const role = participantSelection[member.id];
        if (!role || role === "none") {
          return null;
        }
        return { id: member.id, role };
      })
      .filter((participant): participant is Participant => participant !== null);
  }, [participantSelection, teamMembers]);

  const eventRequest = useMemo<EventRequest>(() => {
    return {
      id: "draft-event-request",
      eventType,
      durationMinutes,
      durationDays,
      priority,
      resourceRequirements: {
        mode: eventMode,
        seats: requiredSeats,
        features: requiredFeatures,
      },
      participants: selectedParticipants,
      searchWindow: {
        start: toDate(eventDate, startTime),
        end:
          eventType === "timed"
            ? toDate(eventDate, endTime)
            : toDate(addDaysToDateInput(eventDate, 3), endTime),
      },
      slotIncrementMinutes: 15,
    };
  }, [
    durationDays,
    durationMinutes,
    endTime,
    eventDate,
    eventMode,
    eventType,
    priority,
    requiredFeatures,
    requiredSeats,
    selectedParticipants,
    startTime,
  ]);

  async function findBestSlots() {
    setSubmitError(null);
    setIsFindingSlots(true);

    try {
      const next = onFindSuggestions
        ? await onFindSuggestions({ title, eventRequest })
        : generateScheduleSuggestions({
            eventRequest,
            participantAvailability,
            existingEvents,
            resources: rooms,
            maxSuggestions: 6,
          });
      setSuggestions(next);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Vorschläge konnten nicht berechnet werden.",
      );
    } finally {
      setIsFindingSlots(false);
    }
  }

  function applySuggestion(suggestion: ScheduleSuggestion) {
    setEventDate(toDateInput(suggestion.start));
    setStartTime(toTimeInput(suggestion.start));
    setEndTime(toTimeInput(suggestion.end));
    const minutes = Math.round(
      (suggestion.end.getTime() - suggestion.start.getTime()) / 60_000,
    );
    if (eventType === "timed" && minutes > 0) {
      setDurationMinutes(minutes);
    }
    if (suggestion.assignedResource) {
      setSelectedResourceId(suggestion.assignedResource.id);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const start =
        eventType === "timed"
          ? toDate(eventDate, startTime)
          : toDate(eventDate, "00:00");
      const end =
        eventType === "timed"
          ? toDate(eventDate, endTime)
          : eventType === "all-day"
            ? toDate(addDaysToDateInput(eventDate, 1), "00:00")
            : toDate(addDaysToDateInput(eventDate, durationDays), "00:00");

      if (!(start < end)) {
        throw new Error("Ende muss nach dem Start liegen.");
      }

      const participantRoles = Object.fromEntries(
        selectedParticipants.map((participant) => [
          participant.id,
          participant.role,
        ]),
      );

      await onSubmit({
        title,
        participantIds: selectedParticipants.map((p) => p.id),
        participantRoles,
        resourceId:
          eventMode === "online"
            ? undefined
            : selectedResourceId ?? undefined,
        start: start.toISOString(),
        end: end.toISOString(),
      });

      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Termin konnte nicht erstellt werden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSuggestionAction(suggestion: SheetSuggestion) {
    if (!suggestion.id || !onAcceptSuggestion) {
      applySuggestion(suggestion);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onAcceptSuggestion({ ...suggestion, id: suggestion.id });
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Vorschlag konnte nicht akzeptiert werden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateParticipantRole(memberId: string, role: ParticipantRole | "none") {
    setParticipantSelection((current) => ({ ...current, [memberId]: role }));
  }

  function toggleRequiredFeature(feature: ResourceFeature) {
    setRequiredFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        aria-hidden
        className="flex-1 bg-black/30"
        onClick={onClose}
      />
      <aside
        aria-label="Termin erstellen"
        className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l border-[#d9dee7] bg-white shadow-xl"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d9dee7] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#4d6b5f]">
              Neuer Eintrag
            </p>
            <h2 className="text-lg font-semibold">Termin erstellen</h2>
          </div>
          <button
            aria-label="Schließen"
            className="h-9 w-9 rounded-md border border-[#cfd6e0] text-lg text-[#3c4656]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid gap-5 px-5 py-5">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Titel</span>
            <input
              className="h-10 rounded-md border border-[#cfd6e0] px-3"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#3c4656]">Eventtyp</span>
              <select
                className="h-10 rounded-md border border-[#cfd6e0] px-3 capitalize"
                onChange={(event) =>
                  setEventType(event.target.value as EventType)
                }
                value={eventType}
              >
                {eventTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#3c4656]">
                {eventType === "multi-day" ? "Dauer (Tage)" : "Dauer"}
              </span>
              {eventType === "multi-day" ? (
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  min={2}
                  onChange={(event) =>
                    setDurationDays(Number(event.target.value))
                  }
                  type="number"
                  value={durationDays}
                />
              ) : (
                <select
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  disabled={eventType === "all-day"}
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                  value={durationMinutes}
                >
                  {eventType === "all-day" ? (
                    <option value={1440}>1 Tag</option>
                  ) : (
                    <>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </>
                  )}
                </select>
              )}
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Priorität</span>
            <select
              className="h-10 rounded-md border border-[#cfd6e0] px-3 capitalize"
              onChange={(event) => setPriority(event.target.value as Priority)}
              value={priority}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-[1fr_96px_96px] gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#3c4656]">Datum</span>
              <input
                className="h-10 rounded-md border border-[#cfd6e0] px-3"
                onChange={(event) => setEventDate(event.target.value)}
                type="date"
                value={eventDate}
              />
            </label>
            <label
              className={
                eventType === "timed"
                  ? "grid gap-1 text-sm"
                  : "grid gap-1 text-sm opacity-50"
              }
            >
              <span className="font-medium text-[#3c4656]">Von</span>
              <input
                className="h-10 rounded-md border border-[#cfd6e0] px-2"
                disabled={eventType !== "timed"}
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                value={startTime}
              />
            </label>
            <label
              className={
                eventType === "timed"
                  ? "grid gap-1 text-sm"
                  : "grid gap-1 text-sm opacity-50"
              }
            >
              <span className="font-medium text-[#3c4656]">Bis</span>
              <input
                className="h-10 rounded-md border border-[#cfd6e0] px-2"
                disabled={eventType !== "timed"}
                onChange={(event) => setEndTime(event.target.value)}
                type="time"
                value={endTime}
              />
            </label>
          </div>

          <div className="rounded-md border border-[#d9dee7] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#3c4656]">Raum</p>
              <select
                className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                onChange={(event) => setEventMode(event.target.value as EventMode)}
                value={eventMode}
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div
              className={
                eventMode === "online" ? "grid gap-3 opacity-50" : "grid gap-3"
              }
            >
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">
                  Benötigte Plätze
                </span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  disabled={eventMode === "online"}
                  min={1}
                  onChange={(event) =>
                    setRequiredSeats(Number(event.target.value))
                  }
                  type="number"
                  value={requiredSeats}
                />
              </label>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-[#3c4656]">Features</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {featureOptions.map((feature) => (
                    <label
                      className="flex items-center gap-2 rounded-md bg-[#f6f7f9] px-3 py-2 text-sm capitalize"
                      key={feature}
                    >
                      <input
                        checked={requiredFeatures.includes(feature)}
                        disabled={eventMode === "online"}
                        onChange={() => toggleRequiredFeature(feature)}
                        type="checkbox"
                      />
                      {feature}
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">
                  Raum (optional festlegen)
                </span>
                <select
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  disabled={eventMode === "online"}
                  onChange={(event) =>
                    setSelectedResourceId(event.target.value || null)
                  }
                  value={selectedResourceId ?? ""}
                >
                  <option value="">Automatisch</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} · {room.capacity}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-md border border-[#d9dee7] p-3">
            <p className="mb-3 text-sm font-medium text-[#3c4656]">
              Teilnehmer
            </p>
            <div className="grid gap-2">
              {teamMembers.map((member) => (
                <div
                  className="grid gap-2 rounded-md bg-[#f6f7f9] p-2 sm:grid-cols-[1fr_150px]"
                  key={member.id}
                >
                  <p className="text-sm font-medium">{member.name}</p>
                  <select
                    className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                    onChange={(event) =>
                      updateParticipantRole(
                        member.id,
                        event.target.value as ParticipantRole | "none",
                      )
                    }
                    value={participantSelection[member.id] ?? "none"}
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="none">Not included</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <details
            className="rounded-md border border-[#d9dee7]"
            onToggle={(event) =>
              setBestSlotOpen((event.target as HTMLDetailsElement).open)
            }
            open={bestSlotOpen}
          >
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-[#3c4656]">
              <span className="flex items-center justify-between gap-3">
                <span>Besten Slot finden</span>
                <span className="text-xs text-[#687385]">
                  {bestSlotOpen ? "−" : "+"}
                </span>
              </span>
            </summary>

            <div className="grid gap-3 border-t border-[#e3e8ef] px-3 py-3">
              <p className="text-xs text-[#687385]">
                Nutzt die aktuellen Formularwerte (Dauer, Teilnehmer, Raum) und
                schlägt die besten freien Slots vor.
              </p>
              <button
                className="h-9 rounded-md bg-[#1f6f5b] px-3 text-sm font-semibold text-white"
                disabled={isFindingSlots}
                onClick={findBestSlots}
                type="button"
              >
                {isFindingSlots ? "Berechnet…" : "Berechnen"}
              </button>

              {suggestions.length > 0 ? (
                <div className="grid gap-2">
                  {suggestions.map((suggestion) => (
                    <div
                      className="grid gap-2 rounded-md border border-[#d9dee7] p-2 text-sm md:grid-cols-[1fr_72px_88px]"
                      key={suggestion.start.toISOString()}
                    >
                      <div>
                        <p className="font-semibold">
                          {formatSuggestionRange(
                            suggestion.start,
                            suggestion.end,
                            eventType,
                          )}
                        </p>
                        <p className="text-xs text-[#687385]">
                          {formatDate(suggestion.start)} ·{" "}
                          {suggestion.assignedResource?.name ?? "Online"}
                        </p>
                      </div>
                      <span className="flex items-center justify-center rounded-md bg-[#253247] px-2 py-1 text-xs font-semibold text-white">
                        {suggestion.score}
                      </span>
                      <button
                        className="h-9 rounded-md border border-[#1f6f5b] px-2 text-xs font-semibold text-[#1f6f5b]"
                        onClick={() => handleSuggestionAction(suggestion)}
                        type="button"
                      >
                        {suggestion.id ? "Akzeptieren" : "Übernehmen"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-[#cfd6e0] p-3 text-xs text-[#687385]">
                  Noch keine Vorschläge berechnet.
                </p>
              )}
            </div>
          </details>

          {submitError ? (
            <div className="rounded-md border border-[#e5484d] bg-[#fbeaea] px-3 py-2 text-sm text-[#a3262b]">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 mt-auto flex items-center justify-end gap-3 border-t border-[#d9dee7] bg-white px-5 py-4">
          <button
            className="h-10 rounded-md border border-[#cfd6e0] px-4 text-sm font-semibold text-[#253247]"
            onClick={onClose}
            type="button"
          >
            Abbrechen
          </button>
          <button
            className="h-10 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Speichern…" : "Erstellen"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

type SheetSuggestion = ScheduleSuggestion & {
  id?: string;
};

function selectionFromTeamMembers(
  teamMembers: TeamMember[],
): ParticipantSelection {
  return Object.fromEntries(
    teamMembers.map((member) => [member.id, member.defaultRole]),
  );
}

function toDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeInput(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function toDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function addDaysToDateInput(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return toDateInput(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(start)}-${formatter.format(end)}`;
}

function formatSuggestionRange(start: Date, end: Date, type: EventType) {
  if (type === "timed") {
    return formatTimeRange(start, end);
  }
  return formatDate(start);
}
