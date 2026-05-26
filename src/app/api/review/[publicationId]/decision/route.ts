import { z } from "zod";

import { decideReviewItem } from "@/lib/review";

export const dynamic = "force-dynamic";

const ReviewDecisionSchema = z.object({
  status: z.enum(["PENDING", "IN_REVIEW", "APPROVED", "NEEDS_CHANGES", "FALSE_POSITIVE", "ARCHIVED"]),
  reason: z.string().min(1),
  reviewerName: z.string().min(1).default("Reviewer"),
  corrections: z
    .object({
      regulationFamilies: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
      licenceTypes: z.array(z.string()).optional(),
      topicPaths: z.array(z.string()).optional(),
      jurisdictions: z.array(z.string()).optional(),
      summary: z.string().optional(),
      whatChanged: z.string().optional(),
      whoIsAffected: z.string().optional(),
      deadline: z.string().datetime().nullable().optional(),
      recommendedAction: z.string().optional(),
      serviceOfferingIds: z.array(z.string()).optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export async function POST(request: Request, context: { params: Promise<{ publicationId: string }> }) {
  const params = await context.params;
  const body = ReviewDecisionSchema.parse(await request.json());
  const result = await decideReviewItem({
    publicationId: params.publicationId,
    status: body.status,
    reason: body.reason,
    reviewerName: body.reviewerName,
    corrections: body.corrections,
  });

  return Response.json(result);
}
