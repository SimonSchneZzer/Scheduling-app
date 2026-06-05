import { NextResponse } from "next/server";
import {
  CalendarEventValidationError,
  deleteAcceptedCalendarEvent,
  updateAcceptedCalendarEvent,
} from "@/db/scheduling-data";
import { isUpdateCalendarEventRequest } from "@/scheduling";

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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const event = await deleteAcceptedCalendarEvent(id);

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
    console.error(error);

    return NextResponse.json(
      { error: "Calendar event could not be deleted." },
      { status: 503 },
    );
  }
}
