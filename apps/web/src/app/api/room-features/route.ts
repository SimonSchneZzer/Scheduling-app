import { NextResponse } from "next/server";
import { FeatureSlugError, createFeature, listFeatures } from "@/db/management";
import { parseFeatureInput } from "@/scheduling";

export async function GET() {
  try {
    return NextResponse.json(await listFeatures());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Features are unavailable." },
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

  const input = parseFeatureInput(payload);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid feature payload." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await createFeature(input));
  } catch (error) {
    if (error instanceof FeatureSlugError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Feature could not be created (the label may already exist)." },
      { status: 503 },
    );
  }
}
