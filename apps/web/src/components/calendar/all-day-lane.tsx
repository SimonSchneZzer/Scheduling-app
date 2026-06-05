import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  useRef,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CalendarEvent } from "@/scheduling";
import { GUTTER_PX } from "./lib/dimensions";
import { eventVariant, type CalendarEventVariant } from "./lib/event-variant";
import { packAllDayRows } from "./lib/layout";
import { addDays } from "./lib/range";

const BAR_HEIGHT = 22;
const ROW_GAP = 4;
const subscribeNoop = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const variantStyles: Record<CalendarEventVariant, string> = {
  accepted: "border border-[#bcdccd] bg-[#e8f3ee] text-[#1c5345]",
  suggestion:
    "border border-dashed border-[#d99a32] bg-[#fff7e6] text-[#7a4a08]",
};

type AllDayLaneProps = {
  weekDays: Date[];
  allDayEvents: CalendarEvent[];
  selectedEventId: string | null;
  onSelect: (event: CalendarEvent, rect: DOMRect) => void;
  onResize: (event: CalendarEvent, start: Date, end: Date) => void;
};

export function AllDayLane({
  weekDays,
  allDayEvents,
  selectedEventId,
  onSelect,
  onResize,
}: AllDayLaneProps) {
  const rows = packAllDayRows(allDayEvents, weekDays);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const dayCount = weekDays.length;

  if (rows.length === 0) {
    return (
      <div className="flex border-b border-[#e3e8ef] bg-[#fbfcfd]">
        <div
          className="flex shrink-0 items-start pt-2 pr-2 text-right text-[11px] font-medium uppercase tracking-wide text-[#9aa4b2]"
          style={{ width: GUTTER_PX, justifyContent: "flex-end" }}
        >
          All day
        </div>
        <div className="relative flex-1 py-2" ref={laneRef} style={{ height: 32 }}>
          <AllDayDropZones weekDays={weekDays} />
        </div>
      </div>
    );
  }

  const laneHeight = rows.length * BAR_HEIGHT + (rows.length - 1) * ROW_GAP;

  return (
    <div className="flex border-b border-[#e3e8ef] bg-[#fbfcfd]">
      <div
        className="flex shrink-0 items-start pt-2 pr-2 text-right text-[11px] font-medium uppercase tracking-wide text-[#9aa4b2]"
        style={{ width: GUTTER_PX, justifyContent: "flex-end" }}
      >
        All day
      </div>

      <div
        className="relative flex-1 py-2"
        ref={laneRef}
        style={{ height: laneHeight + 16 }}
      >
        <AllDayDropZones weekDays={weekDays} />
        {rows.map((row, rowIndex) =>
          row.map((placement) => {
            const widthPercent = (placement.span / dayCount) * 100;
            const leftPercent =
              (placement.startIndex / dayCount) * 100;

            const isSelected = placement.event.id === selectedEventId;

            const placementProps = {
              event: placement.event,
              isSelected,
              leftPercent,
              onSelect,
              top: rowIndex * (BAR_HEIGHT + ROW_GAP) + 8,
              widthPercent,
            };

            return !placement.event.preview ? (
              <AcceptedAllDayBar
                {...placementProps}
                key={placement.event.id}
                laneRef={laneRef}
                onResize={onResize}
                weekDays={weekDays}
              />
            ) : (
              <StaticAllDayBar {...placementProps} key={placement.event.id} />
            );
          }),
        )}
      </div>
    </div>
  );
}

function AllDayDropZones({ weekDays }: { weekDays: Date[] }) {
  return (
    <div className="absolute inset-0 flex">
      {weekDays.map((day, index) => (
        <AllDayDropZone day={day} index={index} key={day.toISOString()} />
      ))}
    </div>
  );
}

function AllDayDropZone({ day, index }: { day: Date; index: number }) {
  const { setNodeRef } = useDroppable({
    id: `all-day-${index}`,
    data: { day, dayIndex: index, allDay: true },
  });

  return (
    <div
      ref={setNodeRef}
      className="min-w-0 flex-1 border-r border-[#eef1f5] last:border-r-0"
    />
  );
}

type StaticAllDayBarProps = {
  event: CalendarEvent;
  isSelected: boolean;
  leftPercent: number;
  widthPercent: number;
  top: number;
  onSelect: (event: CalendarEvent, rect: DOMRect) => void;
};

type AcceptedAllDayBarProps = StaticAllDayBarProps & {
  laneRef: RefObject<HTMLDivElement | null>;
  weekDays: Date[];
  onResize: (event: CalendarEvent, start: Date, end: Date) => void;
};

function StaticAllDayBar({
  event,
  isSelected,
  leftPercent,
  widthPercent,
  top,
  onSelect,
}: StaticAllDayBarProps) {
  return (
    <button
      className={`absolute flex items-center overflow-hidden rounded px-2 text-left text-[11px] font-medium transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f5b] ${
        variantStyles[eventVariant(event)]
      } ${isSelected ? "ring-2 ring-[#1f6f5b]" : ""}`}
      onClick={(clickEvent) =>
        onSelect(event, clickEvent.currentTarget.getBoundingClientRect())
      }
      style={{
        top,
        height: BAR_HEIGHT,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        cursor: "pointer",
      }}
      title={event.title}
      type="button"
    >
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function AcceptedAllDayBar({
  event,
  isSelected,
  laneRef,
  leftPercent,
  widthPercent,
  top,
  weekDays,
  onSelect,
  onResize,
}: AcceptedAllDayBarProps) {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const resizeRef = useRef<{
    edge: "start" | "end";
    start: Date;
    end: Date;
  } | null>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: !hydrated,
  });

  if (!hydrated) {
    return (
      <StaticAllDayBar
        event={event}
        isSelected={isSelected}
        leftPercent={leftPercent}
        onSelect={onSelect}
        top={top}
        widthPercent={widthPercent}
      />
    );
  }

  const dndAttributes = hydrated ? attributes : {};
  const dndListeners = hydrated ? listeners : {};

  function dayFromPointer(clientX: number) {
    const node = laneRef.current;
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width === 0) {
      return null;
    }
    const index = Math.min(
      weekDays.length - 1,
      Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * weekDays.length)),
    );
    return weekDays[index];
  }

  function beginResize(
    pointer: ReactPointerEvent<HTMLSpanElement>,
    edge: "start" | "end",
  ) {
    pointer.stopPropagation();
    pointer.preventDefault();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    resizeRef.current = { edge, start: event.start, end: event.end };
  }

  function updateResize(pointer: ReactPointerEvent<HTMLSpanElement>) {
    const resize = resizeRef.current;
    if (!resize) {
      return;
    }
    const day = dayFromPointer(pointer.clientX);
    if (!day) {
      return;
    }
    if (resize.edge === "start") {
      const nextStart = day;
      if (nextStart < resize.end) {
        resizeRef.current = { ...resize, start: nextStart };
      }
      return;
    }
    const nextEnd = addDays(day, 1);
    if (nextEnd > resize.start) {
      resizeRef.current = { ...resize, end: nextEnd };
    }
  }

  function commitResize(pointer: ReactPointerEvent<HTMLSpanElement>) {
    const resize = resizeRef.current;
    if (!resize) {
      return;
    }
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
      pointer.currentTarget.releasePointerCapture(pointer.pointerId);
    }
    resizeRef.current = null;
    onResize(event, resize.start, resize.end);
  }

  return (
    <button
      className={`absolute flex items-center overflow-hidden rounded px-2 text-left text-[11px] font-medium transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f5b] ${
        variantStyles[eventVariant(event)]
      } ${isSelected ? "ring-2 ring-[#1f6f5b]" : ""}`}
      onClick={(clickEvent) =>
        onSelect(event, clickEvent.currentTarget.getBoundingClientRect())
      }
      ref={setNodeRef}
      style={{
        top,
        height: BAR_HEIGHT,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        opacity: isDragging ? 0.35 : 1,
        cursor: "grab",
        touchAction: "none",
      }}
      title={event.title}
      type="button"
      {...dndAttributes}
      {...dndListeners}
    >
      <span
        aria-label="Start ändern"
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-[#1f6f5b]/30"
        onPointerDown={(pointer) => beginResize(pointer, "start")}
        onPointerMove={updateResize}
        onPointerUp={commitResize}
        onPointerCancel={commitResize}
        role="separator"
      />
      <span className="truncate">{event.title}</span>
      <span
        aria-label="Ende ändern"
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-[#1f6f5b]/30"
        onPointerDown={(pointer) => beginResize(pointer, "end")}
        onPointerMove={updateResize}
        onPointerUp={commitResize}
        onPointerCancel={commitResize}
        role="separator"
      />
    </button>
  );
}
