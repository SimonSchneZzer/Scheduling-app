import { NextResponse } from "next/server";
import { deleteFeature, updateFeature } from "@/db/management";
import { parseFeatureInput } from "@/scheduling";

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

  const input = parseFeatureInput(payload);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid feature payload." },
      { status: 400 },
    );
  }

  try {
    const feature = await updateFeature(id, input);
    if (!feature) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }
    return NextResponse.json(feature);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Feature could not be updated." },
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
    const deleted = await deleteFeature(id);
    if (!deleted) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }
    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Feature could not be deleted." },
      { status: 503 },
    );
  }
}
