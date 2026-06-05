"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CalendarEvent, RoomResource, TeamMember } from "@/scheduling";
import { formatEventWhen } from "./lib/format";

const POPOVER_WIDTH = 280;
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 8;
const ESTIMATED_HEIGHT = 220;

type EventDetailsProps = {
  event: CalendarEvent;
  anchorRect: DOMRect;
  teamMembers: TeamMember[];
  rooms: RoomResource[];
  onClose: () => void;
  onDelete?: (event: CalendarEvent) => void;
};

export function EventDetails({
  event,
  anchorRect,
  teamMembers,
  rooms,
  onClose,
  onDelete,
}: EventDetailsProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const height = popoverRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;

    // Prefer the right of the block; flip to the left when it would overflow.
    let left = anchorRect.right + ANCHOR_GAP;
    if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = anchorRect.left - POPOVER_WIDTH - ANCHOR_GAP;
    }
    left = clamp(
      left,
      VIEWPORT_MARGIN,
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    );

    const top = clamp(
      anchorRect.top,
      VIEWPORT_MARGIN,
      window.innerHeight - height - VIEWPORT_MARGIN,
    );

    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        onClose();
      }
    };
    // The anchor rect is captured at click time, so any scroll/resize would
    // leave the popover misplaced — close it instead of tracking.
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  const room = rooms.find((item) => item.id === event.resourceId) ?? null;
  const participantNames = event.participantIds.map(
    (id) => teamMembers.find((member) => member.id === id)?.name ?? id,
  );

  return createPortal(
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        aria-label={`Details for ${event.title}`}
        className="fixed z-50 rounded-lg border border-[#d9dee7] bg-white p-4 shadow-xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        ref={popoverRef}
        role="dialog"
        style={{
          width: POPOVER_WIDTH,
          top: position?.top ?? anchorRect.top,
          left: position?.left ?? anchorRect.left,
          opacity: position ? 1 : 0,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-[#1d2430]">
            {event.title}
          </h3>
          <button
            aria-label="Close details"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9aa4b2] hover:bg-[#f6f7f9] hover:text-[#3c4656]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
            event.source === "accepted"
              ? "bg-[#e8f3ee] text-[#1f6f5b]"
              : event.source === "suggestion"
                ? "bg-[#fff7e6] text-[#7a4a08]"
              : "bg-[#eef1f5] text-[#3c4656]"
          }`}
        >
          {event.source === "accepted"
            ? "Accepted"
            : event.source === "suggestion"
              ? "Suggestion"
              : "Seeded"}
        </span>

        <dl className="mt-3 grid gap-2.5 text-sm">
          <DetailRow icon={<ClockIcon />}>{formatEventWhen(event)}</DetailRow>
          <DetailRow icon={<PinIcon />}>
            {room ? (
              <>
                {room.name}
                <span className="text-[#9aa4b2]"> · {room.capacity} seats</span>
              </>
            ) : (
              <span className="text-[#687385]">Online · no room</span>
            )}
          </DetailRow>

          <div className="flex gap-2.5">
            <span className="mt-0.5 text-[#9aa4b2]">
              <PeopleIcon />
            </span>
            <div className="flex-1">
              {participantNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {participantNames.map((name) => (
                    <span
                      className="rounded bg-[#f3f5f8] px-2 py-0.5 text-xs text-[#3c4656]"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#687385]">No participants</span>
              )}
            </div>
          </div>
        </dl>

        {event.source === "accepted" && onDelete ? (
          <div className="mt-4 border-t border-[#e3e8ef] pt-3">
            <button
              className="h-9 w-full rounded-md border border-[#e5484d] px-3 text-sm font-semibold text-[#a3262b] hover:bg-[#fbeaea]"
              onClick={() => onDelete(event)}
              type="button"
            >
              Termin löschen
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[#9aa4b2]">{icon}</span>
      <span className="flex-1 text-[#3c4656]">{children}</span>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  // max can fall below min on very small viewports; favour staying on-screen.
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

const iconProps = {
  "aria-hidden": true,
  fill: "none",
  height: 15,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
  viewBox: "0 0 24 24",
  width: 15,
};

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 10c0 6-8 11-8 11s-8-5-8-11a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 19v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
