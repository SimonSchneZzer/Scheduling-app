"use client";

import { useDraggable } from "@dnd-kit/core";
import { useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarEvent } from "@/scheduling";
import { eventVariant, type CalendarEventVariant } from "./lib/event-variant";
import { formatTimeRange } from "./lib/format";
import { dateFromGridOffset } from "./lib/layout";

const subscribeNoop = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

const GAP_PX = 3;

type EventBlockProps = {
  event: CalendarEvent;
  /** Top offset as a fraction (0..1) of the grid body height. */
  top: number;
  /** Height as a fraction (0..1) of the grid body height. */
  height: number;
  column: number;
  columnCount: number;
  roomName: string | null;
  isSelected: boolean;
  onSelect: (event: CalendarEvent, rect: DOMRect) => void;
  dayMidnight: Date;
  startHour: number;
  endHour: number;
  draggable?: boolean;
  resizable?: boolean;
  /** True when this block is the active drag/resize target — render dimmed. */
  isInteractionSource?: boolean;
  onResizeBegin?: (event: CalendarEvent) => void;
  onResizeUpdate?: (end: Date) => void;
  onResizeEnd?: () => void;
};

const variantStyles: Record<CalendarEventVariant, string> = {
  accepted: "border-l-[3px] border-[#1f6f5b] bg-[#e8f3ee] text-[#1c5345]",
  suggestion:
    "border-l-[3px] border-[#b7791f] bg-[#fff7e6] text-[#7a4a08] outline outline-1 outline-dashed outline-[#d99a32]",
};

export function EventBlock({
  event,
  top,
  height,
  column,
  columnCount,
  roomName,
  isSelected,
  onSelect,
  dayMidnight,
  startHour,
  endHour,
  draggable = false,
  resizable = false,
  isInteractionSource = false,
  onResizeBegin,
  onResizeUpdate,
  onResizeEnd,
}: EventBlockProps) {
  const widthPercent = 100 / columnCount;
  const leftPercent = column * widthPercent;

  const hydrated = useSyncExternalStore(
    subscribeNoop,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: !draggable || !hydrated,
  });

  const dndAttributes = hydrated ? attributes : {};
  const dndListeners = hydrated ? listeners : {};

  function handleResizePointerDown(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (!resizable) {
      return;
    }
    pointer.stopPropagation();
    pointer.preventDefault();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    onResizeBegin?.(event);
  }

  function handleResizePointerMove(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (!resizable) {
      return;
    }
    if (!pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
      return;
    }
    const dayCol = pointer.currentTarget.closest(
      "[data-day-column]",
    ) as HTMLElement | null;
    if (!dayCol) {
      return;
    }
    const rect = dayCol.getBoundingClientRect();
    const yFraction = (pointer.clientY - rect.top) / rect.height;
    const date = dateFromGridOffset(dayMidnight, yFraction, startHour, endHour);
    onResizeUpdate?.(date);
  }

  function handleResizePointerUp(pointer: ReactPointerEvent<HTMLDivElement>) {
    if (!resizable) {
      return;
    }
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
      pointer.currentTarget.releasePointerCapture(pointer.pointerId);
    }
    onResizeEnd?.();
  }

  const dimmed = isInteractionSource || isDragging;

  return (
    <div
      className={`absolute overflow-hidden rounded-md shadow-sm transition focus-within:ring-2 focus-within:ring-[#1f6f5b] ${
        variantStyles[eventVariant(event)]
      } ${isSelected ? "ring-2 ring-[#1f6f5b]" : ""}`}
      ref={setNodeRef}
      style={{
        top: `${top * 100}%`,
        height: `${height * 100}%`,
        left: `calc(${leftPercent}% + ${column === 0 ? GAP_PX : GAP_PX / 2}px)`,
        width: `calc(${widthPercent}% - ${GAP_PX * 1.5}px)`,
        minHeight: 18,
        opacity: dimmed ? 0.35 : 1,
        cursor: draggable ? "grab" : "pointer",
        touchAction: draggable ? "none" : undefined,
      }}
      {...dndAttributes}
      {...dndListeners}
    >
      <button
        className="block h-full w-full overflow-hidden px-2 py-1 text-left focus:outline-none"
        onClick={(clickEvent) =>
          onSelect(event, clickEvent.currentTarget.getBoundingClientRect())
        }
        title={`${event.title} · ${formatTimeRange(event.start, event.end)}${
          roomName ? ` · ${roomName}` : ""
        }`}
        type="button"
      >
        <p className="truncate text-xs font-semibold leading-tight">
          {event.title}
        </p>
        <p className="truncate text-[11px] leading-tight opacity-80">
          {formatTimeRange(event.start, event.end)}
        </p>
        {roomName ? (
          <p className="truncate text-[11px] leading-tight opacity-70">
            {roomName}
          </p>
        ) : null}
      </button>

      {resizable ? (
        <div
          aria-label="Größe ändern"
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-transparent hover:bg-[#1f6f5b]/40"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          role="separator"
          style={{ touchAction: "none" }}
        />
      ) : null}
    </div>
  );
}
