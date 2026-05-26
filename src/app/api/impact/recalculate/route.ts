import { NextResponse } from "next/server";

import { requireOperator } from "@/lib/authz";
import { recalculateImpactScores } from "@/lib/impact-recalculation";

export async function POST() {
  const operator = await requireOperator();
  const organisationId =
    operator.mode === "clerk" && !operator.isInternalOperator ? (operator.organisationId ?? undefined) : undefined;
  const result = await recalculateImpactScores(organisationId);
  return NextResponse.json({ ok: true, result });
}
