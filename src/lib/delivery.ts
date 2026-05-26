import type { AlertChannel, IntegrationProvider, IntegrationStatus, Prisma } from "@prisma/client";
import { Resend } from "resend";

import { getEnv, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

type AlertDeliveryPayload = {
  subject: string;
  text: string;
  html?: string;
  to?: string | null;
  title?: string;
  publicationUrl?: string;
  sourceUrl?: string;
  impactBucket?: string;
  impactScore?: number;
  serviceOfferingIds?: string[];
};

export type IntegrationHealth = {
  provider: IntegrationProvider;
  label: string;
  configured: boolean;
  status: "ENABLED" | "DISABLED" | "MISCONFIGURED";
  message: string;
  databaseStatus?: IntegrationStatus;
  displayName?: string;
  nonSecretConfigJson?: Prisma.JsonValue | null;
  lastHealthCheckAt?: string | null;
  lastHealthMessage?: string | null;
};

export type DeliveryResult = {
  provider: IntegrationProvider;
  status: "SENT" | "FAILED" | "BLOCKED_BY_CONFIG";
  requestJson?: Record<string, unknown>;
  responseJson?: Record<string, unknown>;
  errorMessage?: string;
};

let resendClient: Resend | null = null;

function getResendClient(apiKey: string) {
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export function providerForChannel(channel: AlertChannel): IntegrationProvider | null {
  if (channel === "EMAIL_REALTIME" || channel === "EMAIL_DIGEST_DAILY" || channel === "EMAIL_DIGEST_WEEKLY") {
    return "RESEND";
  }
  if (channel === "SLACK") return "SLACK";
  if (channel === "MS_TEAMS") return "MS_TEAMS";
  if (channel === "HUBSPOT") return "HUBSPOT";
  return null;
}

export function listIntegrationHealth(): IntegrationHealth[] {
  const env = getEnv();
  const checks: IntegrationHealth[] = [
    {
      provider: "RESEND",
      label: "Resend email",
      configured: Boolean(env.RESEND_API_KEY && env.RESEND_FROM),
      status: env.RESEND_API_KEY && env.RESEND_FROM ? "ENABLED" : "DISABLED",
      message:
        env.RESEND_API_KEY && env.RESEND_FROM
          ? "Email delivery can send approved alerts."
          : "Set RESEND_API_KEY and RESEND_FROM before email sends.",
    },
    {
      provider: "SLACK",
      label: "Slack webhook",
      configured: Boolean(env.SLACK_WEBHOOK_URL),
      status: env.SLACK_WEBHOOK_URL ? "ENABLED" : "DISABLED",
      message: env.SLACK_WEBHOOK_URL ? "Slack webhook configured." : "Set SLACK_WEBHOOK_URL before Slack sends.",
    },
    {
      provider: "MS_TEAMS",
      label: "Teams webhook",
      configured: Boolean(env.TEAMS_WEBHOOK_URL),
      status: env.TEAMS_WEBHOOK_URL ? "ENABLED" : "DISABLED",
      message: env.TEAMS_WEBHOOK_URL ? "Teams webhook configured." : "Set TEAMS_WEBHOOK_URL before Teams sends.",
    },
    {
      provider: "HUBSPOT",
      label: "HubSpot",
      configured: Boolean(env.HUBSPOT_ACCESS_TOKEN),
      status: env.HUBSPOT_ACCESS_TOKEN ? "ENABLED" : "DISABLED",
      message: env.HUBSPOT_ACCESS_TOKEN
        ? "HubSpot token configured for reviewed lead creation."
        : "Set HUBSPOT_ACCESS_TOKEN before HubSpot creates leads.",
    },
  ];

  return checks;
}

export async function listIntegrationDiagnostics(organisationId?: string | null): Promise<IntegrationHealth[]> {
  const health = listIntegrationHealth();
  if (!hasDatabaseUrl()) return health;

  const configs = await getPrisma().integrationConfig.findMany({
    where: {
      OR: [{ organisationId: null }, organisationId ? { organisationId } : { id: "__none__" }],
    },
  });
  return health.map((item) => {
    const config =
      configs.find((entry) => entry.provider === item.provider && entry.organisationId === organisationId) ??
      configs.find((entry) => entry.provider === item.provider && entry.organisationId === null);
    return {
      ...item,
      databaseStatus: config?.status,
      displayName: config?.displayName,
      nonSecretConfigJson: config?.nonSecretConfigJson ?? null,
      lastHealthCheckAt: config?.lastHealthCheckAt?.toISOString() ?? null,
      lastHealthMessage: config?.lastHealthMessage ?? null,
    };
  });
}

function missingConfig(provider: IntegrationProvider, message: string): DeliveryResult {
  return {
    provider,
    status: "BLOCKED_BY_CONFIG",
    errorMessage: message,
  };
}

export async function getDeliveryGovernanceBlock(channel: AlertChannel, organisationId: string) {
  const provider = providerForChannel(channel);
  if (!provider) {
    return missingConfig("HUBSPOT", `Channel ${channel} has no reviewed external delivery provider.`);
  }
  if (!hasDatabaseUrl()) return null;

  const configs = await getPrisma().integrationConfig.findMany({
    where: {
      provider,
      OR: [{ organisationId }, { organisationId: null }],
    },
  });
  const config =
    configs.find((item) => item.organisationId === organisationId) ??
    configs.find((item) => item.organisationId === null);
  if (!config || config.status !== "ENABLED") {
    return missingConfig(provider, `${provider} delivery is disabled in governed integration settings.`);
  }

  return null;
}

export async function deliverApprovedAlert(input: {
  channel: AlertChannel;
  payload: AlertDeliveryPayload;
}): Promise<DeliveryResult> {
  const env = getEnv();
  const provider = providerForChannel(input.channel);
  if (!provider) {
    return missingConfig("RESEND", `Channel ${input.channel} has no external delivery provider.`);
  }

  if (provider === "RESEND") {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
      return missingConfig(provider, "Resend is not configured.");
    }
    if (!input.payload.to) {
      return missingConfig(provider, "Alert has no approved email recipient.");
    }

    const requestJson = {
      from: env.RESEND_FROM,
      to: input.payload.to,
      subject: input.payload.subject,
    };
    const { data, error } = await getResendClient(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM,
      to: input.payload.to,
      subject: input.payload.subject,
      text: input.payload.text,
      html: input.payload.html,
    });

    if (error) {
      return {
        provider,
        status: "FAILED",
        requestJson,
        responseJson: error as Record<string, unknown>,
        errorMessage: error.message,
      };
    }

    return {
      provider,
      status: "SENT",
      requestJson,
      responseJson: { id: data?.id },
    };
  }

  if (provider === "SLACK") {
    if (!env.SLACK_WEBHOOK_URL) return missingConfig(provider, "Slack webhook is not configured.");
    const requestJson = { text: input.payload.text };
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestJson),
    });
    const responseText = await response.text();
    return response.ok
      ? { provider, status: "SENT", requestJson, responseJson: { status: response.status, body: responseText } }
      : {
          provider,
          status: "FAILED",
          requestJson,
          responseJson: { status: response.status, body: responseText },
          errorMessage: `Slack webhook returned ${response.status}.`,
        };
  }

  if (provider === "MS_TEAMS") {
    if (!env.TEAMS_WEBHOOK_URL) return missingConfig(provider, "Teams webhook is not configured.");
    const requestJson = {
      text: input.payload.text,
      title: input.payload.subject,
    };
    const response = await fetch(env.TEAMS_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestJson),
    });
    const responseText = await response.text();
    return response.ok
      ? { provider, status: "SENT", requestJson, responseJson: { status: response.status, body: responseText } }
      : {
          provider,
          status: "FAILED",
          requestJson,
          responseJson: { status: response.status, body: responseText },
          errorMessage: `Teams webhook returned ${response.status}.`,
        };
  }

  if (!env.HUBSPOT_ACCESS_TOKEN) return missingConfig(provider, "HubSpot token is not configured.");
  const contactRequestJson = input.payload.to
    ? {
        properties: {
          email: input.payload.to,
          lifecyclestage: "lead",
          source: "EU Financial Reg Horizon Scanner",
        },
      }
    : null;
  let contactId: string | null = null;
  if (contactRequestJson) {
    const contactResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(contactRequestJson),
    });
    const contactJson = (await contactResponse.json().catch(() => null)) as { id?: string } | null;
    contactId = contactJson?.id ?? null;
  }

  const requestJson = {
    properties: {
      dealname: input.payload.title ?? input.payload.subject,
      pipeline: "default",
      dealstage: "appointmentscheduled",
      description: input.payload.text,
    },
    associations: contactId
      ? [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 3,
              },
            ],
          },
        ]
      : undefined,
  };
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(requestJson),
  });
  const responseJson = (await response.json().catch(() => ({ status: response.status }))) as Record<string, unknown>;

  return response.ok
    ? { provider, status: "SENT", requestJson: { contactRequestJson, dealRequestJson: requestJson }, responseJson }
    : {
        provider,
        status: "FAILED",
        requestJson: { contactRequestJson, dealRequestJson: requestJson },
        responseJson,
        errorMessage: `HubSpot returned ${response.status}.`,
      };
}
