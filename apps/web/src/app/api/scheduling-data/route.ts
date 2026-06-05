import { NextResponse } from "next/server";
import {
  deleteAcceptedCalendarEvents,
  loadSchedulingData,
} from "@/db/scheduling-data";
import { serializeSchedulingData } from "@/scheduling";

export async function GET() {
  try {
    const data = await loadSchedulingData();

    return NextResponse.json(serializeSchedulingData(data));
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    await deleteAcceptedCalendarEvents();

    const data = await loadSchedulingData();
    return NextResponse.json(serializeSchedulingData(data));
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function databaseErrorResponse(error: unknown) {
  console.error(error);

  return NextResponse.json(
    { error: "Database scheduling data is unavailable." },
    { status: 503 },
  );
}
