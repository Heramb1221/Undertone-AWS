import { NextRequest, NextResponse } from "next/server";
import { generateAnonymousName, InterestId } from "@/lib/nameGenerator";

/**
 * Local-dev stand-in for the real backend endpoint (backend/app/identity/).
 * Once the Flask API is deployed (Phase 4+), swap the fetch call in
 * app/onboarding/page.tsx to hit that instead — same request/response shape.
 */
export async function POST(req: NextRequest) {
  const { interests } = (await req.json()) as { interests: InterestId[] };
  const name = generateAnonymousName(interests ?? []);
  return NextResponse.json({ name });
}
