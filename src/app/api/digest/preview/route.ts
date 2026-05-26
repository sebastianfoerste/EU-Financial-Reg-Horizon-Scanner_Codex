import { NextResponse } from "next/server";

import { getActiveOrganisationId } from "@/lib/authz";
import { getDigestPreview } from "@/lib/publications";

export async function GET() {
  const organisationId = await getActiveOrganisationId();
  return NextResponse.json(await getDigestPreview(organisationId));
}
