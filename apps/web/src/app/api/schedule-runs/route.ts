import { NextResponse } from "next/server";
import {
  createScheduleRun,
  loadScheduleRunHistory,
} from "@/db/scheduling-data";
import {
  serializeScheduleRunHistory,
  serializeScheduleRunResponse,
  type CreateScheduleRunRequest,
  type EventMode,
  type EventRequest,
  type EventType,
  type ParticipantRole,
  type Priority,
  type ResourceFeature,
} from "@/scheduling";

export async function GET() {
  try {
    return NextResponse.json(
      serializeScheduleRunHistory(await loadScheduleRunHistory()),
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Schedule run history could not be loaded." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseCreateScheduleRunRequest(payload);

  if (!input) {
    return NextResponse.json(
      { error: "Invalid schedule run payload." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      serializeScheduleRunResponse(await createScheduleRun(input)),
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Schedule run could not be created." },
      { status: 503 },
    );
  }
}

function parseCreateScheduleRunRequest(
  value: unknown,
): CreateScheduleRunRequest | null {
  if (!isRecord(value) || typeof value.title !== "string") {
    return null;
  }

  const eventRequest = parseEventRequest(value.eventRequest);

  if (!eventRequest || value.title.trim().length === 0) {
    return null;
  }

  return {
    title: value.title,
    eventRequest,
  };
}

function parseEventRequest(value: unknown): EventRequest | null {
  if (!isRecord(value) || !isRecord(value.searchWindow)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    !isEventType(value.eventType) ||
    typeof value.durationMinutes !== "number" ||
    value.durationMinutes <= 0 ||
    (value.durationDays !== undefined &&
      (typeof value.durationDays !== "number" || value.durationDays <= 0)) ||
    !isPriority(value.priority) ||
    !isRecord(value.resourceRequirements) ||
    !isEventMode(value.resourceRequirements.mode) ||
    typeof value.resourceRequirements.seats !== "number" ||
    value.resourceRequirements.seats < 0 ||
    !Array.isArray(value.resourceRequirements.features) ||
    !value.resourceRequirements.features.every(isResourceFeature) ||
    !Array.isArray(value.participants) ||
    !value.participants.every(isParticipant) ||
    typeof value.searchWindow.start !== "string" ||
    !isValidDate(value.searchWindow.start) ||
    typeof value.searchWindow.end !== "string" ||
    !isValidDate(value.searchWindow.end) ||
    new Date(value.searchWindow.start) >= new Date(value.searchWindow.end) ||
    (value.slotIncrementMinutes !== undefined &&
      (typeof value.slotIncrementMinutes !== "number" ||
        value.slotIncrementMinutes <= 0))
  ) {
    return null;
  }

  return {
    id: value.id,
    eventType: value.eventType,
    durationMinutes: value.durationMinutes,
    durationDays: value.durationDays,
    priority: value.priority,
    resourceRequirements: {
      mode: value.resourceRequirements.mode,
      seats: value.resourceRequirements.seats,
      features: value.resourceRequirements.features,
    },
    participants: value.participants,
    searchWindow: {
      start: new Date(value.searchWindow.start),
      end: new Date(value.searchWindow.end),
    },
    slotIncrementMinutes: value.slotIncrementMinutes,
  };
}

function isParticipant(value: unknown): value is {
  id: string;
  role: ParticipantRole;
} {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isParticipantRole(value.role)
  );
}

function isParticipantRole(value: unknown): value is ParticipantRole {
  return value === "required" || value === "optional";
}

function isPriority(value: unknown): value is Priority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

function isEventMode(value: unknown): value is EventMode {
  return value === "offline" || value === "online";
}

function isEventType(value: unknown): value is EventType {
  return value === "timed" || value === "all-day" || value === "multi-day";
}

function isResourceFeature(value: unknown): value is ResourceFeature {
  return value === "whiteboard" || value === "screen" || value === "video";
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
