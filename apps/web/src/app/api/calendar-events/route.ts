import { NextResponse } from "next/server";
import {
  CalendarEventValidationError,
  createAcceptedCalendarEvent,
} from "@/db/scheduling-data";
import { isAcceptSuggestionRequest } from "@/scheduling";

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
    if (error instanceof CalendarEventValidationError) {
      return NextResponse.json(
        {
          error: "Accepted event violates scheduling constraints.",
          reasons: error.reasons,
        },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Accepted event could not be persisted." },
      { status: 503 },
    );
  }
}
