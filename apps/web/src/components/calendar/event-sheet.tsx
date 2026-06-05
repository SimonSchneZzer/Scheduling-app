"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateScheduleSuggestions } from "@/scheduling";
import { isAllDayEvent } from "./lib/layout";
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
  UpdateCalendarEventRequest,
} from "@/scheduling";

type ParticipantSelection = Record<string, ParticipantRole | "none">;

/** Live preview of where a new event will land, mirrored onto the grid. */
export type EventDraftPreview = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
};

const eventTypeOptions: EventType[] = ["timed", "all-day"];
const priorityOptions: Priority[] = ["low", "medium", "high", "urgent"];
const featureOptions: ResourceFeature[] = ["whiteboard", "screen", "video"];

const DRAFT_PREVIEW_ID = "draft-preview";
/** Keep in sync with the `duration-200` transition on the sheet/backdrop. */
const SHEET_ANIM_MS = 200;

export type EventSheetProps = {
  onClose: () => void;
  teamMembers: TeamMember[];
  rooms: RoomResource[];
  participantAvailability: ParticipantAvailability[];
  existingEvents: CalendarEvent[];
  initialRange?: { start: Date; end: Date };
  /** When set, the sheet opens in edit mode for this event. */
  event?: CalendarEvent;
  onAcceptSuggestion?: (suggestion: StoredScheduleSuggestion) => Promise<void>;
  onFindSuggestions?: (
    request: CreateScheduleRunRequest,
  ) => Promise<StoredScheduleSuggestion[]>;
  onSuggestionsPreview?: (
    request: CreateScheduleRunRequest,
    suggestions: ScheduleSuggestion[],
  ) => void;
  onSubmit: (request: AcceptSuggestionRequest) => Promise<void>;
  onUpdate?: (id: string, patch: UpdateCalendarEventRequest) => Promise<void>;
  onDelete?: (event: CalendarEvent) => void;
  onDraftChange?: (draft: EventDraftPreview | null) => void;
};

export function EventSheet({
  onClose,
  teamMembers,
  rooms,
  participantAvailability,
  existingEvents,
  initialRange,
  event,
  onAcceptSuggestion,
  onFindSuggestions,
  onSuggestionsPreview,
  onSubmit,
  onUpdate,
  onDelete,
  onDraftChange,
}: EventSheetProps) {
  const isEdit = Boolean(event);
  const initialStart = event?.start ?? initialRange?.start;
  const initialEnd = event?.end ?? initialRange?.end;
  const initialDurationMinutes =
    initialStart && initialEnd
      ? Math.max(15, Math.round((initialEnd.getTime() - initialStart.getTime()) / 60_000))
      : 45;

  const [title, setTitle] = useState(event?.title ?? "New event");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventType, setEventType] = useState<EventType>(() =>
    event && isAllDayEvent(event.start, event.end) ? "all-day" : "timed",
  );
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [priority, setPriority] = useState<Priority>("medium");
  const [eventDate, setEventDate] = useState(() =>
    toDateInput(initialStart ?? new Date()),
  );
  // End date for all-day events. Stored end is the exclusive next-midnight, so
  // the inclusive last day shown is end - 1 day.
  const [endDate, setEndDate] = useState(() =>
    event && isAllDayEvent(event.start, event.end)
      ? toDateInput(addDaysToDate(event.end, -1))
      : toDateInput(initialStart ?? new Date()),
  );
  const [startTime, setStartTime] = useState(() =>
    initialStart ? toTimeInput(initialStart) : "09:00",
  );
  const [endTime, setEndTime] = useState(() =>
    initialEnd ? toTimeInput(initialEnd) : "09:45",
  );
  const [eventMode, setEventMode] = useState<EventMode>(
    event && !event.resourceId ? "online" : "offline",
  );
  const [requiredSeats, setRequiredSeats] = useState(6);
  const [requiredFeatures, setRequiredFeatures] = useState<ResourceFeature[]>([]);
  const [participantSelection, setParticipantSelection] =
    useState<ParticipantSelection>(() =>
      event
        ? selectionFromParticipantIds(event.participantIds, teamMembers)
        : selectionFromTeamMembers(teamMembers),
    );
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    event?.resourceId ?? null,
  );
  const [bestSlotOpen, setBestSlotOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SheetSuggestion[]>([]);
  const [isFindingSlots, setIsFindingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // `open` drives both the enter and exit transition; closingRef guards against
  // double-triggering the delayed unmount.
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);

  // Start off-screen, then animate in on the next frame after mount.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    setOpen(false);
    window.setTimeout(onClose, SHEET_ANIM_MS);
  }, [onClose]);

  const editParticipantNames = useMemo(() => {
    if (!event) {
      return [];
    }
    return event.participantIds.map(
      (id) => teamMembers.find((member) => member.id === id)?.name ?? id,
    );
  }, [event, teamMembers]);

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

  // Single source of truth for the create preview: whatever the form currently
  // describes is mirrored onto the grid as a preview block.
  const draftRange = useMemo(() => {
    if (eventType !== "timed") {
      return null;
    }
    const start = toDate(eventDate, startTime);
    const end = toDate(eventDate, endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    if (!(start < end)) {
      return null;
    }
    return { start, end };
  }, [eventDate, endTime, eventType, startTime]);

  useEffect(() => {
    if (isEdit || !onDraftChange) {
      return;
    }
    if (!draftRange) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      id: DRAFT_PREVIEW_ID,
      title,
      start: draftRange.start,
      end: draftRange.end,
      resourceId:
        eventMode === "online" ? undefined : selectedResourceId ?? undefined,
    });
  }, [
    draftRange,
    eventMode,
    isEdit,
    onDraftChange,
    selectedResourceId,
    title,
  ]);

  useEffect(() => {
    return () => onDraftChange?.(null);
  }, [onDraftChange]);

  const durationDays = useMemo(
    () => (eventType === "all-day" ? daysBetweenInclusive(eventDate, endDate) : 1),
    [endDate, eventDate, eventType],
  );

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
            : // For all-day search, give the engine room beyond the picked range.
              toDate(addDaysToDateInput(endDate, 7), "00:00"),
      },
      slotIncrementMinutes: 15,
    };
  }, [
    durationDays,
    durationMinutes,
    endDate,
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
      onSuggestionsPreview?.({ title, eventRequest }, next);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not calculate suggestions.",
      );
    } finally {
      setIsFindingSlots(false);
    }
  }

  function applySuggestion(suggestion: ScheduleSuggestion) {
    setEventDate(toDateInput(suggestion.start));
    if (eventType === "all-day") {
      // Stored end is the exclusive next-midnight; show the inclusive last day.
      setEndDate(toDateInput(addDaysToDate(suggestion.end, -1)));
    } else {
      setStartTime(toTimeInput(suggestion.start));
      setEndTime(toTimeInput(suggestion.end));
      const minutes = Math.round(
        (suggestion.end.getTime() - suggestion.start.getTime()) / 60_000,
      );
      if (minutes > 0) {
        setDurationMinutes(minutes);
      }
    }
    if (suggestion.assignedResource) {
      setSelectedResourceId(suggestion.assignedResource.id);
    }
  }

  function computeRange() {
    if (eventType === "timed") {
      return { start: toDate(eventDate, startTime), end: toDate(eventDate, endTime) };
    }
    // All-day: whole days from the start date through the inclusive end date,
    // so the stored end is the midnight after the last day.
    return {
      start: toDate(eventDate, "00:00"),
      end: toDate(addDaysToDateInput(endDate, 1), "00:00"),
    };
  }

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { start, end } = computeRange();

      if (!(start < end)) {
        throw new Error("End must be after start.");
      }

      const trimmedDescription = description.trim();

      if (isEdit && event && onUpdate) {
        await onUpdate(event.id, {
          title,
          description: trimmedDescription.length > 0 ? trimmedDescription : null,
          resourceId:
            eventMode === "online" ? null : selectedResourceId ?? null,
          start: start.toISOString(),
          end: end.toISOString(),
        });
        requestClose();
        return;
      }

      const participantRoles = Object.fromEntries(
        selectedParticipants.map((participant) => [
          participant.id,
          participant.role,
        ]),
      );

      await onSubmit({
        title,
        description:
          trimmedDescription.length > 0 ? trimmedDescription : undefined,
        participantIds: selectedParticipants.map((p) => p.id),
        participantRoles,
        resourceId:
          eventMode === "online" ? undefined : selectedResourceId ?? undefined,
        start: start.toISOString(),
        end: end.toISOString(),
      });

      onSuggestionsPreview?.({ title, eventRequest }, []);
      requestClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Event could not be saved."
            : "Event could not be created.",
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
      onSuggestionsPreview?.({ title, eventRequest }, []);
      requestClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Suggestion could not be accepted.",
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
        className={`flex-1 bg-black/40 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
      />
      <aside
        aria-label={isEdit ? "Edit event" : "Create event"}
        className={`flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l border-[#d9dee7] bg-white shadow-xl transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d9dee7] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#4d6b5f]">
              {isEdit ? "Edit" : "New entry"}
            </p>
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit event" : "Create event"}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="h-9 w-9 rounded-md border border-[#cfd6e0] text-lg text-[#3c4656]"
            onClick={requestClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid gap-5 px-5 py-5">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Title</span>
            <input
              className="h-10 rounded-md border border-[#cfd6e0] px-3"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Description</span>
            <textarea
              className="min-h-[72px] rounded-md border border-[#cfd6e0] px-3 py-2"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes for this event"
              value={description}
            />
          </label>

          {!isEdit ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-[#3c4656]">Event type</span>
                  <select
                    className="h-10 rounded-md border border-[#cfd6e0] px-3 capitalize"
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    value={eventType}
                  >
                    {eventTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {eventType === "timed" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#3c4656]">Duration</span>
                    <select
                      className="h-10 rounded-md border border-[#cfd6e0] px-3"
                      onChange={(e) =>
                        setDurationMinutes(Number(e.target.value))
                      }
                      value={durationMinutes}
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Priority</span>
                <select
                  className="h-10 rounded-md border border-[#cfd6e0] px-3 capitalize"
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  value={priority}
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {eventType === "timed" ? (
            <div className="grid grid-cols-[1fr_96px_96px] gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Date</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  onChange={(e) => setEventDate(e.target.value)}
                  type="date"
                  value={eventDate}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">From</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-2"
                  onChange={(e) => setStartTime(e.target.value)}
                  type="time"
                  value={startTime}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">To</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-2"
                  onChange={(e) => setEndTime(e.target.value)}
                  type="time"
                  value={endTime}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Start date</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  onChange={(e) => {
                    const next = e.target.value;
                    setEventDate(next);
                    if (next > endDate) {
                      setEndDate(next);
                    }
                  }}
                  type="date"
                  value={eventDate}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">End date</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  min={eventDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  type="date"
                  value={endDate}
                />
              </label>
            </div>
          )}

          <div className="rounded-md border border-[#d9dee7] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#3c4656]">Room</p>
              <select
                className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                onChange={(e) => setEventMode(e.target.value as EventMode)}
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
              {!isEdit ? (
                <>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#3c4656]">
                      Required seats
                    </span>
                    <input
                      className="h-10 rounded-md border border-[#cfd6e0] px-3"
                      disabled={eventMode === "online"}
                      min={1}
                      onChange={(e) => setRequiredSeats(Number(e.target.value))}
                      type="number"
                      value={requiredSeats}
                    />
                  </label>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-[#3c4656]">
                      Features
                    </p>
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
                </>
              ) : null}

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">
                  Room (optional)
                </span>
                <select
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  disabled={eventMode === "online"}
                  onChange={(e) =>
                    setSelectedResourceId(e.target.value || null)
                  }
                  value={selectedResourceId ?? ""}
                >
                  <option value="">Automatic</option>
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
              Participants
            </p>
            {isEdit ? (
              <div className="flex flex-wrap gap-1.5">
                {editParticipantNames.length > 0 ? (
                  editParticipantNames.map((name) => (
                    <span
                      className="rounded bg-[#f3f5f8] px-2 py-0.5 text-xs text-[#3c4656]"
                      key={name}
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#687385]">No participants</span>
                )}
                <p className="mt-2 w-full text-xs text-[#9aa4b2]">
                  Participant editing comes in a later update.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {teamMembers.map((member) => (
                  <div
                    className="grid gap-2 rounded-md bg-[#f6f7f9] p-2 sm:grid-cols-[1fr_150px]"
                    key={member.id}
                  >
                    <p className="text-sm font-medium">{member.name}</p>
                    <select
                      className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                      onChange={(e) =>
                        updateParticipantRole(
                          member.id,
                          e.target.value as ParticipantRole | "none",
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
            )}
          </div>

          {!isEdit ? (
            <details
              className="rounded-md border border-[#d9dee7]"
              onToggle={(e) =>
                setBestSlotOpen((e.target as HTMLDetailsElement).open)
              }
              open={bestSlotOpen}
            >
              <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-[#3c4656]">
                <span className="flex items-center justify-between gap-3">
                  <span>Find best slot</span>
                  <span className="text-xs text-[#687385]">
                    {bestSlotOpen ? "−" : "+"}
                  </span>
                </span>
              </summary>

              <div className="grid gap-3 border-t border-[#e3e8ef] px-3 py-3">
                <p className="text-xs text-[#687385]">
                  Uses the current form values (duration, participants, room) and
                  suggests the best free slots.
                </p>
                <button
                  className="h-9 rounded-md bg-[#1f6f5b] px-3 text-sm font-semibold text-white"
                  disabled={isFindingSlots}
                  onClick={findBestSlots}
                  type="button"
                >
                  {isFindingSlots ? "Calculating…" : "Calculate"}
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
                          {suggestion.id ? "Accept" : "Apply"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-[#cfd6e0] p-3 text-xs text-[#687385]">
                    No suggestions calculated yet.
                  </p>
                )}
              </div>
            </details>
          ) : null}

          {submitError ? (
            <div className="rounded-md border border-[#e5484d] bg-[#fbeaea] px-3 py-2 text-sm text-[#a3262b]">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-[#d9dee7] bg-white px-5 py-4">
          {isEdit && event && onDelete ? (
            <button
              className="h-10 rounded-md border border-[#e5484d] px-4 text-sm font-semibold text-[#a3262b] hover:bg-[#fbeaea]"
              onClick={() => {
                onDelete(event);
                requestClose();
              }}
              type="button"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              className="h-10 rounded-md border border-[#cfd6e0] px-4 text-sm font-semibold text-[#253247]"
              onClick={requestClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white"
              disabled={isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting
                ? "Saving…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </button>
          </div>
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

function selectionFromParticipantIds(
  participantIds: string[],
  teamMembers: TeamMember[],
): ParticipantSelection {
  return Object.fromEntries(
    teamMembers.map((member) => [
      member.id,
      participantIds.includes(member.id) ? "required" : "none",
    ]),
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
  return toDateInput(addDaysToDate(new Date(`${date}T00:00:00`), days));
}

function addDaysToDate(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

/** Inclusive whole-day span between two date inputs (>= 1). */
function daysBetweenInclusive(startInput: string, endInput: string) {
  const start = new Date(`${startInput}T00:00:00`);
  const end = new Date(`${endInput}T00:00:00`);
  const diffDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.max(1, diffDays + 1);
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
