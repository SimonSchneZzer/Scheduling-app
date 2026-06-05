import { NextResponse } from "next/server";
import {
  CalendarEventValidationError,
  updateAcceptedCalendarEvent,
} from "@/db/scheduling-data";
import type { UpdateCalendarEventRequest } from "@/scheduling";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isUpdateCalendarEventRequest(payload)) {
    return NextResponse.json(
      { error: "Invalid update payload." },
      { status: 400 },
    );
  }

  try {
    const event = await updateAcceptedCalendarEvent(id, payload);

    if (!event) {
      return NextResponse.json(
        { error: "Calendar event not found or not editable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    });
  } catch (error) {
    if (error instanceof CalendarEventValidationError) {
      return NextResponse.json(
        {
          error: "Calendar event update violates scheduling constraints.",
          reasons: error.reasons,
        },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Calendar event could not be updated." },
      { status: 503 },
    );
  }
}

function isUpdateCalendarEventRequest(
  value: unknown,
): value is UpdateCalendarEventRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.start === "string" &&
    isValidDate(value.start) &&
    typeof value.end === "string" &&
    isValidDate(value.end) &&
    new Date(value.start) < new Date(value.end) &&
    (value.resourceId === undefined ||
      value.resourceId === null ||
      typeof value.resourceId === "string") &&
    (value.title === undefined || typeof value.title === "string")
  );
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
