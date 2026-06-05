import { NextResponse } from "next/server";
import {
  acceptStoredScheduleSuggestion,
  CalendarEventValidationError,
  ScheduleSuggestionNotFoundError,
} from "@/db/scheduling-data";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const event = await acceptStoredScheduleSuggestion(id);

    return NextResponse.json({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    });
  } catch (error) {
    if (error instanceof ScheduleSuggestionNotFoundError) {
      return NextResponse.json(
        { error: "Schedule suggestion not found." },
        { status: 404 },
      );
    }

    if (error instanceof CalendarEventValidationError) {
      return NextResponse.json(
        {
          error: "Stored suggestion violates current scheduling constraints.",
          reasons: error.reasons,
        },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Stored suggestion could not be accepted." },
      { status: 503 },
    );
  }
}
