"use client";

import { useMemo, useState } from "react";
import {
  initialCalendarEvents,
  participantAvailability,
  rooms,
  teamMembers,
} from "@/scheduling/mock-data";
import { generateScheduleSuggestions } from "@/scheduling";
import type {
  CalendarEvent,
  EventMode,
  EventRequest,
  Participant,
  ParticipantRole,
  Priority,
  ResourceFeature,
  ScheduleSuggestion,
} from "@/scheduling";

type ParticipantSelection = Record<string, ParticipantRole | "none">;

const priorityOptions: Priority[] = ["low", "medium", "high", "urgent"];
const featureOptions: ResourceFeature[] = ["whiteboard", "screen", "video"];

const initialSelection: ParticipantSelection = Object.fromEntries(
  teamMembers.map((member) => [member.id, member.defaultRole]),
);

export function SchedulingDashboard() {
  const [title, setTitle] = useState("Workshop planning slot");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [priority, setPriority] = useState<Priority>("high");
  const [eventDate, setEventDate] = useState("2026-06-08");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [eventMode, setEventMode] = useState<EventMode>("offline");
  const [requiredSeats, setRequiredSeats] = useState(8);
  const [requiredFeatures, setRequiredFeatures] = useState<ResourceFeature[]>([
    "whiteboard",
    "screen",
  ]);
  const [participantSelection, setParticipantSelection] =
    useState<ParticipantSelection>(initialSelection);
  const [acceptedEvents, setAcceptedEvents] =
    useState<CalendarEvent[]>(initialCalendarEvents);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [lastRunTitle, setLastRunTitle] = useState<string | null>(null);

  const selectedParticipants = useMemo(() => {
    return teamMembers
      .map<Participant | null>((member) => {
        const role = participantSelection[member.id];

        if (!role || role === "none") {
          return null;
        }

        return {
          id: member.id,
          role,
        };
      })
      .filter((participant): participant is Participant => participant !== null);
  }, [participantSelection]);

  const eventRequest = useMemo<EventRequest>(() => {
    return {
      id: "draft-event-request",
      durationMinutes,
      priority,
      resourceRequirements: {
        mode: eventMode,
        seats: requiredSeats,
        features: requiredFeatures,
      },
      participants: selectedParticipants,
      searchWindow: {
        start: toDate(eventDate, startTime),
        end: toDate(eventDate, endTime),
      },
      slotIncrementMinutes: 15,
    };
  }, [
    durationMinutes,
    endTime,
    eventDate,
    eventMode,
    priority,
    requiredFeatures,
    requiredSeats,
    selectedParticipants,
    startTime,
  ]);

  const requiredCount = selectedParticipants.filter(
    (participant) => participant.role === "required",
  ).length;
  const optionalCount = selectedParticipants.filter(
    (participant) => participant.role === "optional",
  ).length;

  function calculateSuggestions() {
    const nextSuggestions = generateScheduleSuggestions({
      eventRequest,
      participantAvailability,
      existingEvents: acceptedEvents,
      resources: rooms,
      maxSuggestions: 6,
    });

    setSuggestions(nextSuggestions);
    setLastRunTitle(title);
  }

  function acceptSuggestion(suggestion: ScheduleSuggestion) {
    const acceptedEvent: CalendarEvent = {
      id: `accepted-${acceptedEvents.length + 1}`,
      participantIds: selectedParticipants.map((participant) => participant.id),
      resourceId: suggestion.assignedResource?.id,
      start: suggestion.start,
      end: suggestion.end,
    };

    setAcceptedEvents((events) =>
      [...events, acceptedEvent].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    );
    setSuggestions((current) =>
      current.filter(
        (item) => item.start.getTime() !== suggestion.start.getTime(),
      ),
    );
  }

  function updateParticipantRole(memberId: string, role: ParticipantRole | "none") {
    setParticipantSelection((current) => ({
      ...current,
      [memberId]: role,
    }));
  }

  function toggleRequiredFeature(feature: ResourceFeature) {
    setRequiredFeatures((current) => {
      if (current.includes(feature)) {
        return current.filter((item) => item !== feature);
      }

      return [...current, feature];
    });
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#1d2430]">
      <header className="border-b border-[#d9dee7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#4d6b5f]">Scheduling App</p>
            <h1 className="text-2xl font-semibold">Team calendar planning</h1>
          </div>
          <button
            className="h-10 w-full rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white md:w-auto"
            onClick={calculateSuggestions}
            type="button"
          >
            Calculate best slots
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[400px_1fr]">
        <section className="rounded-lg border border-[#d9dee7] bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Event request</h2>
              <p className="text-sm text-[#687385]">
                Define the input for the scoring engine.
              </p>
            </div>
            <span className="rounded-md bg-[#e8f3ee] px-2 py-1 text-xs font-semibold capitalize text-[#1f6f5b]">
              {eventMode}
            </span>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#3c4656]">Title</span>
              <input
                className="h-10 rounded-md border border-[#cfd6e0] px-3"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Duration</span>
                <select
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                  value={durationMinutes}
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Priority</span>
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
            </div>

            <div className="grid grid-cols-[1fr_96px_96px] gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">Date</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-3"
                  onChange={(event) => setEventDate(event.target.value)}
                  type="date"
                  value={eventDate}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">From</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-2"
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  value={startTime}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#3c4656]">To</span>
                <input
                  className="h-10 rounded-md border border-[#cfd6e0] px-2"
                  onChange={(event) => setEndTime(event.target.value)}
                  type="time"
                  value={endTime}
                />
              </label>
            </div>

            <div className="rounded-md border border-[#d9dee7] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#3c4656]">
                  Room constraints
                </p>
                <select
                  className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                  onChange={(event) =>
                    setEventMode(event.target.value as EventMode)
                  }
                  value={eventMode}
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div
                className={
                  eventMode === "online"
                    ? "grid gap-3 opacity-50"
                    : "grid gap-3"
                }
              >
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-[#3c4656]">
                    Required seats
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
                  <p className="text-sm font-medium text-[#3c4656]">
                    Required features
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
              </div>

              {eventMode === "online" ? (
                <p className="mt-3 text-xs text-[#687385]">
                  Online events ignore physical room constraints.
                </p>
              ) : null}
            </div>

            <div className="rounded-md border border-[#d9dee7] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#3c4656]">Participants</p>
                <p className="text-xs text-[#687385]">
                  {requiredCount} required, {optionalCount} optional
                </p>
              </div>
              <div className="grid gap-2">
                {teamMembers.map((member) => (
                  <div
                    className="grid gap-2 rounded-md bg-[#f6f7f9] p-2 sm:grid-cols-[1fr_150px]"
                    key={member.id}
                  >
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-[#687385]">
                        Availability seeded for MVP
                      </p>
                    </div>
                    <select
                      className="h-9 rounded-md border border-[#cfd6e0] bg-white px-2 text-sm capitalize"
                      onChange={(event) =>
                        updateParticipantRole(
                          member.id,
                          event.target.value as ParticipantRole | "none",
                        )
                      }
                      value={participantSelection[member.id]}
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="none">Not included</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Best slots</h2>
                <p className="text-sm text-[#687385]">
                  {lastRunTitle
                    ? `Ranked suggestions for ${lastRunTitle}`
                    : "Run the engine to generate ranked suggestions."}
                </p>
              </div>
              <span className="rounded-md border border-[#d9dee7] px-2 py-1 text-xs font-semibold">
                {suggestions.length} valid
              </span>
            </div>

            {suggestions.length > 0 ? (
              <div className="grid gap-3">
                {suggestions.map((suggestion) => (
                  <div
                    className="grid gap-3 rounded-md border border-[#d9dee7] p-3 lg:grid-cols-[128px_1fr_112px_88px_92px]"
                    key={suggestion.start.toISOString()}
                  >
                    <div>
                      <p className="font-semibold">
                        {formatTimeRange(suggestion.start, suggestion.end)}
                      </p>
                      <p className="text-sm text-[#687385]">
                        {formatDate(suggestion.start)}
                      </p>
                    </div>
                    <div className="grid gap-1 text-sm text-[#3c4656]">
                      {suggestion.explanations.map((explanation) => (
                        <p key={explanation}>{explanation}</p>
                      ))}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">
                        {suggestion.assignedResource?.name ?? "Online"}
                      </p>
                      <p className="text-xs text-[#687385]">
                        {suggestion.assignedResource
                          ? `${suggestion.assignedResource.capacity} seats`
                          : "No room"}
                      </p>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end">
                      <span className="rounded-md bg-[#253247] px-2 py-1 text-sm font-semibold text-white">
                        {suggestion.score}
                      </span>
                    </div>
                    <button
                      className="h-9 rounded-md bg-[#1f6f5b] px-3 text-sm font-semibold text-white"
                      onClick={() => acceptSuggestion(suggestion)}
                      type="button"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#cfd6e0] p-6 text-sm text-[#687385]">
                No suggestions calculated yet. Adjust the request and run the
                scoring engine.
              </div>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Team calendar</h2>
                  <p className="text-sm text-[#687385]">
                    Accepted suggestions become calendar facts.
                  </p>
                </div>
                <span className="rounded-md border border-[#d9dee7] px-2 py-1 text-xs font-semibold">
                  {acceptedEvents.length} events
                </span>
              </div>
              <div className="grid gap-2">
                {acceptedEvents.map((event) => (
                  <div
                    className="grid gap-2 rounded-md border border-[#d9dee7] p-3 md:grid-cols-[132px_1fr_120px]"
                    key={event.id}
                  >
                    <div>
                      <p className="font-semibold">
                        {formatTimeRange(event.start, event.end)}
                      </p>
                      <p className="text-sm text-[#687385]">
                        {formatDate(event.start)}
                      </p>
                    </div>
                    <p className="text-sm text-[#3c4656]">
                      {formatParticipantNames(event.participantIds)}
                    </p>
                    <p className="text-sm text-[#687385]">
                      {formatRoomName(event.resourceId)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">Engine rules</h2>
              <ul className="space-y-2 text-sm text-[#3c4656]">
                <li>Required participant conflicts invalidate slots.</li>
                <li>Optional participant conflicts lower the score.</li>
                <li>Priority adds scoring weight.</li>
                <li>Accepted events block future required-participant slots.</li>
                <li>Offline events need a fitting available room.</li>
                <li>Online events relax physical room constraints.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function toDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
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

function formatParticipantNames(participantIds: string[]) {
  return participantIds
    .map((participantId) => {
      return (
        teamMembers.find((member) => member.id === participantId)?.name ??
        participantId
      );
    })
    .join(", ");
}

function formatRoomName(resourceId: string | undefined) {
  if (!resourceId) {
    return "No room";
  }

  return rooms.find((room) => room.id === resourceId)?.name ?? resourceId;
}
