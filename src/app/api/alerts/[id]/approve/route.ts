import { z } from "zod";

import { approveAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const ApproveAlertSchema = z.object({
  reviewerName: z.string().min(1).default("Reviewer"),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const bodyText = await request.text();
  const body = bodyText ? ApproveAlertSchema.parse(JSON.parse(bodyText)) : { reviewerName: "Reviewer" };
  const result = await approveAlert({ alertId: params.id, reviewerName: body.reviewerName });
  return Response.json(result);
}
