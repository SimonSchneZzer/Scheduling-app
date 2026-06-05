"use client";

import { useDroppable } from "@dnd-kit/core";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarEvent, RoomResource } from "@/scheduling";
import { EventBlock } from "./event-block";
import { formatHourLabel, formatTimeRange, roomLabel } from "./lib/format";
import {
  assignColumns,
  dateFromGridOffset,
  eventsForDay,
  positionInGrid,
} from "./lib/layout";
import { isSameDay } from "./lib/range";
import { DAY_MIN_PX, GUTTER_PX, HOUR_HEIGHT } from "./lib/dimensions";
import type { Interaction } from "./lib/interactions";

const HOUR_LINE_COLOR = "#eef1f5";

type TimeGridProps = {
  weekDays: Date[];
  timedEvents: CalendarEvent[];
  rooms: RoomResource[];
  startHour: number;
  endHour: number;
  now: Date | null;
  selectedEventId: string | null;
  onSelectEvent: (event: CalendarEvent, rect: DOMRect) => void;
  interaction: Interaction;
  interactionConflict: boolean;
  onResizeBegin: (event: CalendarEvent) => void;
  onResizeUpdate: (end: Date) => void;
  onResizeEnd: () => void;
  onCreateBegin: (anchor: Date) => void;
  onCreateUpdate: (cursor: Date) => void;
  onCreateEnd: () => void;
};

export function TimeGrid({
  weekDays,
  timedEvents,
  rooms,
  startHour,
  endHour,
  now,
  selectedEventId,
  onSelectEvent,
  interaction,
  interactionConflict,
  onResizeBegin,
  onResizeUpdate,
  onResizeEnd,
  onCreateBegin,
  onCreateUpdate,
  onCreateEnd,
}: TimeGridProps) {
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );
  const bodyHeight = hours.length * HOUR_HEIGHT;
  const windowMinutes = (endHour - startHour) * 60;

  const hourLineGradient = `repeating-linear-gradient(to bottom, transparent, transparent ${
    HOUR_HEIGHT - 1
  }px, ${HOUR_LINE_COLOR} ${HOUR_HEIGHT - 1}px, ${HOUR_LINE_COLOR} ${HOUR_HEIGHT}px)`;

  return (
    <div className="flex">
      <div
        className="relative shrink-0"
        style={{ width: GUTTER_PX, height: bodyHeight }}
      >
        {hours.map((hour, index) => (
          <span
            key={hour}
            className="absolute right-2 text-[11px] font-medium text-[#9aa4b2]"
            style={{ top: index * HOUR_HEIGHT + 3 }}
          >
            {formatHourLabel(hour)}
          </span>
        ))}
      </div>

      <div className="flex flex-1">
        {weekDays.map((day, dayIndex) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            dayIndex={dayIndex}
            timedEvents={timedEvents}
            rooms={rooms}
            startHour={startHour}
            endHour={endHour}
            bodyHeight={bodyHeight}
            windowMinutes={windowMinutes}
            now={now}
            isToday={now ? isSameDay(day, now) : false}
            hourLineGradient={hourLineGradient}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            interaction={interaction}
            interactionConflict={interactionConflict}
            onResizeBegin={onResizeBegin}
            onResizeUpdate={onResizeUpdate}
            onResizeEnd={onResizeEnd}
            onCreateBegin={onCreateBegin}
            onCreateUpdate={onCreateUpdate}
            onCreateEnd={onCreateEnd}
          />
        ))}
      </div>
    </div>
  );
}

type DayColumnProps = {
  day: Date;
  dayIndex: number;
  timedEvents: CalendarEvent[];
  rooms: RoomResource[];
  startHour: number;
  endHour: number;
  bodyHeight: number;
  windowMinutes: number;
  now: Date | null;
  isToday: boolean;
  hourLineGradient: string;
  selectedEventId: string | null;
  onSelectEvent: (event: CalendarEvent, rect: DOMRect) => void;
  interaction: Interaction;
  interactionConflict: boolean;
  onResizeBegin: (event: CalendarEvent) => void;
  onResizeUpdate: (end: Date) => void;
  onResizeEnd: () => void;
  onCreateBegin: (anchor: Date) => void;
  onCreateUpdate: (cursor: Date) => void;
  onCreateEnd: () => void;
};

function DayColumn({
  day,
  dayIndex,
  timedEvents,
  rooms,
  startHour,
  endHour,
  bodyHeight,
  windowMinutes,
  now,
  isToday,
  hourLineGradient,
  selectedEventId,
  onSelectEvent,
  interaction,
  interactionConflict,
  onResizeBegin,
  onResizeUpdate,
  onResizeEnd,
  onCreateBegin,
  onCreateUpdate,
  onCreateEnd,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const isCreatingRef = useRef(false);

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `day-${dayIndex}`,
    data: { day, dayIndex },
  });

  const positioned = assignColumns(eventsForDay(timedEvents, day));
  const nowFraction =
    isToday && now
      ? (minutesIntoDay(now) - startHour * 60) / windowMinutes
      : null;
  const showNow =
    nowFraction !== null && nowFraction >= 0 && nowFraction <= 1;

  function pointerToDate(clientY: number): Date | null {
    const node = columnRef.current;
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    if (rect.height === 0) {
      return null;
    }
    const yFraction = (clientY - rect.top) / rect.height;
    return dateFromGridOffset(day, yFraction, startHour, endHour);
  }

  function handlePointerDown(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.button !== 0) {
      return;
    }
    if (pointer.target !== pointer.currentTarget) {
      return;
    }
    const date = pointerToDate(pointer.clientY);
    if (!date) {
      return;
    }
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    isCreatingRef.current = true;
    onCreateBegin(date);
  }

  function handlePointerMove(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (!isCreatingRef.current) {
      return;
    }
    const date = pointerToDate(pointer.clientY);
    if (!date) {
      return;
    }
    onCreateUpdate(date);
  }

  function handlePointerUp(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (!isCreatingRef.current) {
      return;
    }
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
      pointer.currentTarget.releasePointerCapture(pointer.pointerId);
    }
    isCreatingRef.current = false;
    onCreateEnd();
  }

  const ghost = computeGhostForDay(day, interaction);

  return (
    <div
      ref={(node) => {
        columnRef.current = node;
        setDroppableRef(node);
      }}
      data-day-column
      className="relative flex-1 border-r border-[#eef1f5] last:border-r-0"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        height: bodyHeight,
        minWidth: DAY_MIN_PX,
        backgroundColor: isToday ? "#f2f8f6" : undefined,
        backgroundImage: hourLineGradient,
        touchAction: "none",
      }}
    >
      {positioned.map(({ event, column, columnCount }) => {
        const { top, height } = positionInGrid(
          event.start,
          event.end,
          day,
          startHour,
          endHour,
        );

        const isInteractionSource =
          (interaction.kind === "moving" || interaction.kind === "resizing") &&
          interaction.eventId === event.id;

        return (
          <EventBlock
            key={event.id}
            event={event}
            top={top}
            height={height}
            column={column}
            columnCount={columnCount}
            roomName={roomLabel(event.resourceId, rooms)}
            isSelected={event.id === selectedEventId}
            onSelect={onSelectEvent}
            dayMidnight={day}
            startHour={startHour}
            endHour={endHour}
            draggable={!event.preview}
            resizable={!event.preview}
            isInteractionSource={isInteractionSource}
            onResizeBegin={onResizeBegin}
            onResizeUpdate={onResizeUpdate}
            onResizeEnd={onResizeEnd}
          />
        );
      })}

      {ghost ? (
        <GhostBlock
          ghost={ghost}
          conflict={interactionConflict}
          day={day}
          startHour={startHour}
          endHour={endHour}
        />
      ) : null}

      {showNow ? (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
          style={{ top: `${nowFraction! * 100}%` }}
        >
          <span className="h-2 w-2 -translate-x-1/2 rounded-full bg-[#e5484d]" />
          <span className="h-px flex-1 bg-[#e5484d]" />
        </div>
      ) : null}
    </div>
  );
}

type Ghost = {
  start: Date;
  end: Date;
  kind: "moving" | "resizing" | "creating";
};

function computeGhostForDay(day: Date, interaction: Interaction): Ghost | null {
  if (interaction.kind === "idle") {
    return null;
  }
  const start = interaction.start;
  const end = interaction.end;
  if (!sameLocalDay(start, day)) {
    return null;
  }
  return { start, end, kind: interaction.kind };
}

function GhostBlock({
  ghost,
  conflict,
  day,
  startHour,
  endHour,
}: {
  ghost: Ghost;
  conflict: boolean;
  day: Date;
  startHour: number;
  endHour: number;
}) {
  const { top, height } = positionInGrid(
    ghost.start,
    ghost.end,
    day,
    startHour,
    endHour,
  );

  const baseClass = conflict
    ? "border-2 border-[#e5484d] bg-[#fbeaea]/80 text-[#a3262b]"
    : "border-2 border-[#1f6f5b] bg-[#e8f3ee]/80 text-[#1c5345]";

  return (
    <div
      className={`pointer-events-none absolute z-20 overflow-hidden rounded-md px-2 py-1 text-left shadow-md ${baseClass}`}
      style={{
        top: `${top * 100}%`,
        height: `${height * 100}%`,
        left: 4,
        right: 4,
      }}
    >
      <p className="truncate text-xs font-semibold leading-tight">
        {ghost.kind === "creating" ? "Neuer Termin" : "Verschieben"}
      </p>
      <p className="truncate text-[11px] leading-tight">
        {formatTimeRange(ghost.start, ghost.end)}
      </p>
      {conflict ? (
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide">
          Konflikt
        </p>
      ) : null}
    </div>
  );
}

function sameLocalDay(date: Date, dayMidnight: Date): boolean {
  return (
    date.getFullYear() === dayMidnight.getFullYear() &&
    date.getMonth() === dayMidnight.getMonth() &&
    date.getDate() === dayMidnight.getDate()
  );
}

function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
