import type { CalendarEvent } from "@/scheduling";
import { GUTTER_PX } from "./lib/dimensions";
import { packAllDayRows } from "./lib/layout";

const BAR_HEIGHT = 22;
const ROW_GAP = 4;
const DAYS_PER_WEEK = 7;

const variantStyles: Record<CalendarEvent["source"], string> = {
  accepted: "border border-[#bcdccd] bg-[#e8f3ee] text-[#1c5345]",
  seed: "border border-[#d5dce5] bg-[#eef1f5] text-[#3c4656]",
};

type AllDayLaneProps = {
  weekDays: Date[];
  allDayEvents: CalendarEvent[];
  selectedEventId: string | null;
  onSelect: (event: CalendarEvent, rect: DOMRect) => void;
};

export function AllDayLane({
  weekDays,
  allDayEvents,
  selectedEventId,
  onSelect,
}: AllDayLaneProps) {
  const rows = packAllDayRows(allDayEvents, weekDays);

  if (rows.length === 0) {
    return null;
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

      <div className="relative flex-1 py-2" style={{ height: laneHeight + 16 }}>
        {rows.map((row, rowIndex) =>
          row.map((placement) => {
            const widthPercent = (placement.span / DAYS_PER_WEEK) * 100;
            const leftPercent =
              (placement.startIndex / DAYS_PER_WEEK) * 100;

            const isSelected = placement.event.id === selectedEventId;

            return (
              <button
                key={placement.event.id}
                className={`absolute flex items-center overflow-hidden rounded px-2 text-left text-[11px] font-medium transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f5b] ${
                  variantStyles[placement.event.source]
                } ${isSelected ? "ring-2 ring-[#1f6f5b]" : ""}`}
                onClick={(clickEvent) =>
                  onSelect(
                    placement.event,
                    clickEvent.currentTarget.getBoundingClientRect(),
                  )
                }
                style={{
                  top: rowIndex * (BAR_HEIGHT + ROW_GAP) + 8,
                  height: BAR_HEIGHT,
                  left: `calc(${leftPercent}% + 2px)`,
                  width: `calc(${widthPercent}% - 4px)`,
                }}
                title={placement.event.title}
                type="button"
              >
                <span className="truncate">{placement.event.title}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
