type CalendarHeaderProps = {
  rangeLabel: string;
  eventCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function CalendarHeader({
  rangeLabel,
  eventCount,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Team calendar</h2>
        <p className="text-sm text-[#687385]">
          {rangeLabel} · {eventCount} {eventCount === 1 ? "event" : "events"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="h-9 rounded-md border border-[#cfd6e0] bg-white px-3 text-sm font-semibold text-[#253247] hover:bg-[#f6f7f9]"
          onClick={onToday}
          type="button"
        >
          Today
        </button>
        <div className="flex items-center overflow-hidden rounded-md border border-[#cfd6e0]">
          <button
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center text-[#3c4656] hover:bg-[#f6f7f9]"
            onClick={onPrev}
            type="button"
          >
            <ChevronLeftIcon />
          </button>
          <span className="h-5 w-px bg-[#e3e8ef]" />
          <button
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center text-[#3c4656] hover:bg-[#f6f7f9]"
            onClick={onNext}
            type="button"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
