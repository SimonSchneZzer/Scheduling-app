import { NextResponse } from "next/server";
import { createRoom, listRooms } from "@/db/management";
import { parseRoomInput } from "@/scheduling";

export async function GET() {
  try {
    return NextResponse.json(await listRooms());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Rooms are unavailable." },
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

  const input = parseRoomInput(payload);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid room payload." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await createRoom(input));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Room could not be created." },
      { status: 503 },
    );
  }
}
