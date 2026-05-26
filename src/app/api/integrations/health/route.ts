import { listIntegrationDiagnostics, listIntegrationHealth } from "@/lib/delivery";
import { getActiveOrganisationId } from "@/lib/authz";
import { getRuntimeChecksWithDatabaseProbe } from "@/lib/runtime-hardening";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = await getRuntimeChecksWithDatabaseProbe();
  let metadataError: string | null = null;
  let integrations: Awaited<ReturnType<typeof listIntegrationDiagnostics>>;
  try {
    const organisationId = await getActiveOrganisationId();
    integrations = await listIntegrationDiagnostics(organisationId);
  } catch {
    metadataError = "Stored integration settings could not be loaded from Postgres.";
    integrations = listIntegrationHealth();
  }
  return Response.json({
    runtime,
    integrations,
    metadataError,
  });
}
