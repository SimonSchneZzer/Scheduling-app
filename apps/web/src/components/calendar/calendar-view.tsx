"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent, RoomResource, TeamMember } from "@/scheduling";
import { AllDayLane } from "./all-day-lane";
import { CalendarHeader } from "./calendar-header";
import { TimeGrid } from "./time-grid";
import { DAY_MIN_PX, GUTTER_PX } from "./lib/dimensions";
import { formatWeekday, formatWeekRangeLabel } from "./lib/format";
import { useCalendarInteractions } from "./lib/interactions";
import {
  dateFromGridOffset,
  splitEvents,
  visibleHourRange,
} from "./lib/layout";
import { addDays, isSameDay, startOfDay, weekDays } from "./lib/range";

const DAYS_PER_WEEK = 7;
const NOW_REFRESH_MS = 60_000;

export type CalendarMovePayload = {
  event: CalendarEvent;
  start: Date;
  end: Date;
};

export type CalendarResizePayload = {
  event: CalendarEvent;
  start?: Date;
  end: Date;
};

type CalendarViewProps = {
  events: CalendarEvent[];
  suggestionEvents?: CalendarEvent[];
  rooms: RoomResource[];
  teamMembers: TeamMember[];
  /** Week to open on; defaults to the current week. */
  initialDate?: Date;
  /** Id of the event currently open in the sheet, highlighted in the grid. */
  activeEventId?: string | null;
  onEventMove?: (payload: CalendarMovePayload) => void;
  onEventResize?: (payload: CalendarResizePayload) => void;
  onEventOpen?: (event: CalendarEvent) => void;
  onRangeCreate?: (range: { start: Date; end: Date }) => void;
};

export function CalendarView({
  events,
  suggestionEvents = [],
  rooms,
  teamMembers,
  initialDate,
  activeEventId,
  onEventMove,
  onEventResize,
  onEventOpen,
  onRangeCreate,
}: CalendarViewProps) {
  const [anchorDate, setAnchorDate] = useState<Date>(
    () => initialDate ?? startOfDay(new Date()),
  );
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [participantFilter, setParticipantFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (event.preview) {
        return;
      }
      onEventOpen?.(event);
    },
    [onEventOpen],
  );

  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = setTimeout(update, 0);
    const interval = setInterval(update, NOW_REFRESH_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const days = useMemo(
    () => (viewMode === "week" ? weekDays(anchorDate) : [startOfDay(anchorDate)]),
    [anchorDate, viewMode],
  );
  const dayCount = days.length;
  const allEvents = useMemo(
    () => [...events, ...suggestionEvents],
    [events, suggestionEvents],
  );
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesParticipant =
        participantFilter === "" ||
        event.participantIds.includes(participantFilter);
      const matchesRoom =
        roomFilter === "" ||
        (roomFilter === "online"
          ? event.resourceId === undefined
          : event.resourceId === roomFilter);

      return matchesParticipant && matchesRoom;
    });
  }, [allEvents, participantFilter, roomFilter]);

  const visibleEvents = useMemo(() => {
    const weekStart = days[0].getTime();
    const weekEnd = addDays(days[dayCount - 1], 1).getTime();

    return filteredEvents.filter(
      (event) =>
        event.start.getTime() < weekEnd && event.end.getTime() > weekStart,
    );
  }, [dayCount, days, filteredEvents]);

  const { allDay, timed } = useMemo(
    () => splitEvents(visibleEvents),
    [visibleEvents],
  );

  const { startHour, endHour } = useMemo(
    () => visibleHourRange(timed),
    [timed],
  );

  const interactions = useCalendarInteractions({ events });
  const {
    interaction,
    beginMove,
    updateMove,
    endMove,
    beginResize,
    updateResize,
    endResize,
    beginCreate,
    updateCreate,
    endCreate,
    cancel,
    conflictsForRequired,
  } = interactions;

  const interactionConflict = useMemo(() => {
    if (interaction.kind === "idle" || interaction.kind === "creating") {
      return false;
    }
    const event = events.find((item) => item.id === interaction.eventId);
    if (!event) {
      return false;
    }
    return conflictsForRequired(
      interaction.start,
      interaction.end,
      event.participantIds,
      event.id,
    );
  }, [conflictsForRequired, events, interaction]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragStart(dragEvent: DragStartEvent) {
    const calendarEvent = dragEvent.active.data.current?.event as
      | CalendarEvent
      | undefined;
    if (!calendarEvent) {
      return;
    }
    beginMove(calendarEvent);
  }

  function handleDragMove(dragEvent: DragMoveEvent) {
    if (interaction.kind !== "moving") {
      return;
    }

    const overData = dragEvent.over?.data.current as
      | { day?: Date; allDay?: boolean }
      | undefined;
    const targetDay = overData?.day;
    const allDayTarget = overData?.allDay === true;
    const activeRect = dragEvent.active.rect.current.translated;
    const overRect = dragEvent.over?.rect;

    if (!targetDay) {
      return;
    }

    if (allDayTarget) {
      const duration =
        interaction.originalEnd.getTime() - interaction.originalStart.getTime();
      const newStart = startOfDay(targetDay);
      const newEnd = new Date(newStart.getTime() + duration);
      updateMove(newStart, newEnd);
      return;
    }

    if (!activeRect || !overRect) {
      return;
    }

    const yFraction = (activeRect.top - overRect.top) / overRect.height;
    const newStart = dateFromGridOffset(
      targetDay,
      yFraction,
      startHour,
      endHour,
    );
    const duration =
      interaction.originalEnd.getTime() - interaction.originalStart.getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    updateMove(newStart, newEnd);
  }

  function handleDragEnd() {
    const snapshot = endMove();
    if (snapshot.kind !== "moving") {
      return;
    }

    const sameStart =
      snapshot.start.getTime() === snapshot.originalStart.getTime();
    const sameEnd =
      snapshot.end.getTime() === snapshot.originalEnd.getTime();

    if (sameStart && sameEnd) {
      return;
    }

    const event = events.find((item) => item.id === snapshot.eventId);
    if (!event) {
      return;
    }

    onEventMove?.({
      event,
      start: snapshot.start,
      end: snapshot.end,
    });
  }

  function handleResizeEndCommit() {
    const snapshot = endResize();
    if (snapshot.kind !== "resizing") {
      return;
    }
    const event = events.find((item) => item.id === snapshot.eventId);
    if (!event) {
      return;
    }
    if (event.start.getTime() === snapshot.start.getTime() && event.end.getTime() === snapshot.end.getTime()) {
      return;
    }
    onEventResize?.({ event, start: snapshot.start, end: snapshot.end });
  }

  function handleAllDayResize(event: CalendarEvent, start: Date, end: Date) {
    if (event.start.getTime() === start.getTime() && event.end.getTime() === end.getTime()) {
      return;
    }
    onEventResize?.({ event, start, end });
  }

  function handleCreateEnd() {
    const snapshot = endCreate();
    if (snapshot.kind !== "creating") {
      return;
    }
    onRangeCreate?.({ start: snapshot.start, end: snapshot.end });
  }

  const todayIndex = now ? days.findIndex((day) => isSameDay(day, now)) : -1;
  const rangeLabel =
    viewMode === "week" ? formatWeekRangeLabel(days) : formatDayRangeLabel(days[0]);
  const navStepDays = viewMode === "week" ? DAYS_PER_WEEK : 1;

  return (
    <section className="rounded-lg border border-[#d9dee7] bg-white p-4">
      <CalendarHeader
        eventCount={visibleEvents.length}
        participantFilter={participantFilter}
        participantOptions={teamMembers}
        onNext={() => {
          cancel();
          setAnchorDate((current) => addDays(current, navStepDays));
        }}
        onPrev={() => {
          cancel();
          setAnchorDate((current) => addDays(current, -navStepDays));
        }}
        onParticipantFilterChange={setParticipantFilter}
        onRoomFilterChange={setRoomFilter}
        onToday={() => {
          cancel();
          setAnchorDate(startOfDay(now ?? new Date()));
        }}
        onViewModeChange={(mode) => {
          cancel();
          setViewMode(mode);
          setAnchorDate((current) =>
            mode === "week" ? startOfDay(current) : startOfDay(current),
          );
        }}
        rangeLabel={rangeLabel}
        roomFilter={roomFilter}
        roomOptions={rooms}
        viewMode={viewMode}
      />

      <div className="mt-4 overflow-x-auto rounded-md border border-[#e3e8ef]">
        <div style={{ minWidth: GUTTER_PX + dayCount * DAY_MIN_PX }}>
          <div className="flex border-b border-[#e3e8ef] bg-white">
            <div className="shrink-0" style={{ width: GUTTER_PX }} />
            <div className="flex flex-1">
              {days.map((day, index) => {
                const isToday = index === todayIndex;

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 border-r border-[#eef1f5] px-2 py-2 text-center last:border-r-0"
                    style={{ minWidth: DAY_MIN_PX }}
                  >
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wide ${
                        isToday ? "text-[#1f6f5b]" : "text-[#9aa4b2]"
                      }`}
                    >
                      {formatWeekday(day)}
                    </p>
                    {isToday ? (
                      <p className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#1f6f5b] text-sm font-semibold text-white">
                        {day.getDate()}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold text-[#3c4656]">
                        {day.getDate()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => cancel()}
          >
            <AllDayLane
              allDayEvents={allDay}
              onResize={handleAllDayResize}
              onSelect={handleEventClick}
              selectedEventId={activeEventId ?? null}
              weekDays={days}
            />

            <div className="relative">
              <TimeGrid
                endHour={endHour}
                now={now}
                onSelectEvent={handleEventClick}
                rooms={rooms}
                selectedEventId={activeEventId ?? null}
                startHour={startHour}
                timedEvents={timed}
                weekDays={days}
                interaction={interaction}
                interactionConflict={interactionConflict}
                onResizeBegin={beginResize}
                onResizeUpdate={updateResize}
                onResizeEnd={handleResizeEndCommit}
                onCreateBegin={beginCreate}
                onCreateUpdate={updateCreate}
                onCreateEnd={handleCreateEnd}
              />

              {visibleEvents.length === 0 && interaction.kind === "idle" ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="rounded-md bg-white/80 px-3 py-1.5 text-sm text-[#9aa4b2]">
                    No events in this view.
                  </p>
                </div>
              ) : null}
            </div>
          </DndContext>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#687385]">
        <LegendSwatch className="border-[#1f6f5b] bg-[#e8f3ee]" label="Accepted" />
        <LegendSwatch
          className="border-[#d99a32] bg-[#fff7e6]"
          label="Suggestion"
        />
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e5484d]" />
          Current time
        </span>
        <span className="text-[#9aa4b2]">
          Tip: drag an event to move it · drag the bottom edge to resize · drag
          across an empty slot to create one.
        </span>
      </div>

    </section>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm border-l-[3px] ${className}`} />
      {label}
    </span>
  );
}

function formatDayRangeLabel(day: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(day);
}
