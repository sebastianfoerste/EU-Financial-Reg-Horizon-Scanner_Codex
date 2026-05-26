import { sendApprovedAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const result = await sendApprovedAlert({ alertId: params.id });
  return Response.json(result);
}
