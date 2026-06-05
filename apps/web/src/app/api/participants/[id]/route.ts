import { NextResponse } from "next/server";
import { deleteParticipant, updateParticipant } from "@/db/management";
import { parseParticipantInput } from "@/scheduling";

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

  const input = parseParticipantInput(payload);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid participant payload." },
      { status: 400 },
    );
  }

  try {
    const participant = await updateParticipant(id, input);
    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(participant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Participant could not be updated." },
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
    const deleted = await deleteParticipant(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Participant not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Participant could not be deleted." },
      { status: 503 },
    );
  }
}
