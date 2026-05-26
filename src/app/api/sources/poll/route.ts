import { NextResponse } from "next/server";

import { requireInternalOperator } from "@/lib/authz";
import { pollTierOneSources } from "@/lib/ingestion/pipeline";

export async function POST() {
  await requireInternalOperator();
  const results = await pollTierOneSources();
  return NextResponse.json({
    ok: results.every((result) => result.status !== "FAILED"),
    results,
  });
}
