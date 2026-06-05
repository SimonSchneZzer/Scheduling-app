import { NextResponse } from "next/server";
import { createParticipant, listParticipants } from "@/db/management";
import { parseParticipantInput } from "@/scheduling";

export async function GET() {
  try {
    return NextResponse.json(await listParticipants());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Participants are unavailable." },
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

  const input = parseParticipantInput(payload);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid participant payload." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await createParticipant(input));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Participant could not be created." },
      { status: 503 },
    );
  }
}
