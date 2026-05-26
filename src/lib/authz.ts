import { getEnv, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export type OperatorContext = {
  userId: string | null;
  organisationId: string | null;
  mode: "clerk" | "demo";
  isInternalOperator: boolean;
  displayName: string | null;
};

export function assertOrganisationAccess(operator: OperatorContext, organisationId: string) {
  if (operator.mode === "clerk" && !operator.isInternalOperator && operator.organisationId !== organisationId) {
    throw new Error("Access outside the active organisation is not permitted.");
  }
}

export function getReviewerName(operator: OperatorContext, submittedName?: string) {
  if (operator.mode === "clerk") {
    return operator.displayName ?? "Authenticated reviewer";
  }
  return submittedName?.trim() || "Demo reviewer";
}

export async function requireOperator(): Promise<OperatorContext> {
  const env = getEnv();
  const clerkConfigured = Boolean(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!clerkConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Clerk is required for production operator actions.");
    }
    return {
      userId: null,
      organisationId: null,
      mode: "demo",
      isInternalOperator: true,
      displayName: null,
    };
  }

  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth();
  if (!session.userId) {
    throw new Error("Authentication required.");
  }

  if (hasDatabaseUrl()) {
    const user = await getPrisma().user.findUnique({
      where: { externalId: session.userId },
      include: {
        memberships: {
          include: { organisation: true },
        },
      },
    });

    if (!user) {
      throw new Error("The signed-in user is not linked to a scanner account.");
    }

    const membership = session.orgId
      ? user.memberships.find((item) => item.organisation.externalId === session.orgId)
      : user.memberships.length === 1
        ? user.memberships[0]
        : undefined;

    if (!membership) {
      throw new Error("Select a linked organisation before accessing client-specific data.");
    }

    return {
      userId: user.id,
      organisationId: membership.organisationId,
      mode: "clerk",
      isInternalOperator: user.isInternalOperator,
      displayName: user.name ?? user.email,
    };
  }

  return {
    userId: session.userId,
    organisationId: session.orgId ?? null,
    mode: "clerk",
    isInternalOperator: false,
    displayName: null,
  };
}

export async function getActiveOrganisationId() {
  if (!hasDatabaseUrl()) return undefined;
  const operator = await requireOperator();
  if (operator.mode === "clerk") return operator.organisationId ?? undefined;
  const organisation = await getPrisma().organisation.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return organisation?.id;
}

export async function requireInternalOperator() {
  const operator = await requireOperator();
  if (operator.mode === "clerk" && !operator.isInternalOperator) {
    throw new Error("Internal operator access is required for this action.");
  }
  return operator;
}
