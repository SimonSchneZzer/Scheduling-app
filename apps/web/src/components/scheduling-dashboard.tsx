"use client";

import { useMemo, useState } from "react";
import {
  initialCalendarEvents,
  participantAvailability,
  teamMembers,
} from "@/scheduling/mock-data";
import { generateScheduleSuggestions } from "@/scheduling";
import type {
  CalendarEvent,
  EventRequest,
  Participant,
  ParticipantRole,
  Priority,
  ScheduleSuggestion,
} from "@/scheduling";

type ParticipantSelection = Record<string, ParticipantRole | "none">;

const priorityOptions: Priority[] = ["low", "medium", "high", "urgent"];

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
    priority,
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
      maxSuggestions: 6,
    });

    setSuggestions(nextSuggestions);
    setLastRunTitle(title);
  }

  function acceptSuggestion(suggestion: ScheduleSuggestion) {
    const acceptedEvent: CalendarEvent = {
      id: `accepted-${acceptedEvents.length + 1}`,
      participantIds: selectedParticipants.map((participant) => participant.id),
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
            <span className="rounded-md bg-[#e8f3ee] px-2 py-1 text-xs font-semibold text-[#1f6f5b]">
              Offline
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
                    className="grid gap-3 rounded-md border border-[#d9dee7] p-3 lg:grid-cols-[128px_1fr_88px_92px]"
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
                    className="grid gap-2 rounded-md border border-[#d9dee7] p-3 md:grid-cols-[132px_1fr]"
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
