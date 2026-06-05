import { NextResponse } from "next/server";
import {
  createScheduleRun,
  loadScheduleRunHistory,
} from "@/db/scheduling-data";
import {
  parseCreateScheduleRunRequest,
  serializeScheduleRunHistory,
  serializeScheduleRunResponse,
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
