import { NextResponse } from "next/server";
import { deleteRoom, updateRoom } from "@/db/management";
import { parseRoomInput } from "@/scheduling";

export async function PUT(
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

  const input = parseRoomInput(payload);
  if (!input) {
    return NextResponse.json({ error: "Invalid room payload." }, { status: 400 });
  }

  try {
    const room = await updateRoom(id, input);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Room could not be updated." },
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
    const deleted = await deleteRoom(id);
    if (!deleted) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Room could not be deleted." },
      { status: 503 },
    );
  }
}
