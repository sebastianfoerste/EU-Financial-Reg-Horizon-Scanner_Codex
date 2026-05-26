import { z } from "zod";

import { generateAlertDrafts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const GenerateAlertsSchema = z.object({
  organisationId: z.string().optional(),
  channels: z
    .array(z.enum(["EMAIL_REALTIME", "EMAIL_DIGEST_DAILY", "EMAIL_DIGEST_WEEKLY", "SLACK", "MS_TEAMS", "HUBSPOT"]))
    .optional(),
});

export async function POST(request: Request) {
  const bodyText = await request.text();
  const body = bodyText ? GenerateAlertsSchema.parse(JSON.parse(bodyText)) : {};
  const result = await generateAlertDrafts(body);
  return Response.json(result);
}
