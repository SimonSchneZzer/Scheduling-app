"use client";

import type { ManagedWindow } from "@/scheduling";

/** Convert an ISO timestamp to a `datetime-local` input value (local time). */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type AvailabilityEditorProps = {
  windows: ManagedWindow[];
  onChange: (windows: ManagedWindow[]) => void;
};

export function AvailabilityEditor({
  windows,
  onChange,
}: AvailabilityEditorProps) {
  function update(index: number, patch: Partial<ManagedWindow>) {
    onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  function remove(index: number) {
    onChange(windows.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...windows, { start: "", end: "" }]);
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-[#3c4656]">Availability</span>
      {windows.length === 0 ? (
        <p className="text-xs text-[#9aa4b2]">
          No windows — treated as never available for required slots.
        </p>
      ) : null}
      {windows.map((window, index) => (
        <div className="flex items-center gap-2" key={index}>
          <input
            aria-label="Window start"
            className="h-9 flex-1 rounded-md border border-[#cfd6e0] px-2 text-sm"
            onChange={(e) => update(index, { start: e.target.value })}
            type="datetime-local"
            value={window.start}
          />
          <span className="text-xs text-[#9aa4b2]">→</span>
          <input
            aria-label="Window end"
            className="h-9 flex-1 rounded-md border border-[#cfd6e0] px-2 text-sm"
            onChange={(e) => update(index, { end: e.target.value })}
            type="datetime-local"
            value={window.end}
          />
          <button
            aria-label="Remove window"
            className="h-9 w-9 shrink-0 rounded-md border border-[#cfd6e0] text-[#a3262b] hover:bg-[#fbeaea]"
            onClick={() => remove(index)}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="justify-self-start rounded-md border border-[#cfd6e0] px-3 py-1.5 text-sm font-medium text-[#253247] hover:bg-[#f6f7f9]"
        onClick={add}
        type="button"
      >
        + Add window
      </button>
    </div>
  );
}
