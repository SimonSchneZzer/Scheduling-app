import { NextResponse } from "next/server";
import { createAcceptedCalendarEvent } from "@/db/scheduling-data";
import type { AcceptSuggestionRequest, ParticipantRole } from "@/scheduling";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isAcceptSuggestionRequest(payload)) {
    return NextResponse.json(
      { error: "Invalid accepted event payload." },
      { status: 400 },
    );
  }

  try {
    const event = await createAcceptedCalendarEvent(payload);

    return NextResponse.json({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Accepted event could not be persisted." },
      { status: 503 },
    );
  }
}

function isAcceptSuggestionRequest(
  value: unknown,
): value is AcceptSuggestionRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    Array.isArray(value.participantIds) &&
    value.participantIds.every((participantId) => typeof participantId === "string") &&
    (value.resourceId === undefined || typeof value.resourceId === "string") &&
    typeof value.start === "string" &&
    isValidDate(value.start) &&
    typeof value.end === "string" &&
    isValidDate(value.end) &&
    new Date(value.start) < new Date(value.end) &&
    isParticipantRoleMap(value.participantRoles)
  );
}

function isParticipantRoleMap(value: unknown) {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isParticipantRole);
}

function isParticipantRole(value: unknown): value is ParticipantRole {
  return value === "required" || value === "optional";
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
