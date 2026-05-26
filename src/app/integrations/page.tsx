import { Activity, PlugZap } from "lucide-react";

import { upsertIntegrationConfigAction } from "@/app/integrations/actions";
import { AppShell } from "@/components/app-shell";
import { getActiveOrganisationId } from "@/lib/authz";
import { listIntegrationDiagnostics, listIntegrationHealth } from "@/lib/delivery";
import { listIntegrationConfigs } from "@/lib/integration-configs";
import { getRuntimeChecksWithDatabaseProbe } from "@/lib/runtime-hardening";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const runtime = await getRuntimeChecksWithDatabaseProbe();
  let configurationError: string | null = null;
  let integrations: ReturnType<typeof listIntegrationHealth>;
  let configs: Awaited<ReturnType<typeof listIntegrationConfigs>> = [];
  let organisationId: string | undefined;
  try {
    organisationId = await getActiveOrganisationId();
    [integrations, configs] = await Promise.all([
      listIntegrationDiagnostics(organisationId),
      listIntegrationConfigs(organisationId),
    ]);
  } catch {
    configurationError = "Stored integration settings could not be loaded from Postgres.";
    integrations = listIntegrationHealth();
  }

  return (
    <AppShell active="/integrations">
      <div className="space-y-6">
        <section className="border-b border-zinc-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Production diagnostics</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
            Configuration checks for auth, database, and reviewed delivery.
          </h1>
        </section>

        {configurationError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {configurationError} Environment checks remain available below.
          </p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Runtime" icon={Activity}>
            {runtime.map((check) => (
              <HealthRow key={check.key} label={check.label} ok={check.ok} message={check.message} />
            ))}
          </Panel>
          <Panel title="Integrations" icon={PlugZap}>
            {integrations.map((check) => (
              <HealthRow
                key={check.provider}
                label={check.label}
                ok={check.configured}
                message={check.message}
                detail={
                  check.databaseStatus
                    ? `Catalogue status ${check.databaseStatus}. ${check.lastHealthMessage ?? "No stored health message."}`
                    : "No Postgres integration row loaded."
                }
              />
            ))}
          </Panel>
        </section>

        {configs.length ? <section className="rounded-md border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-normal text-zinc-500">
            Governed integration settings
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {configs.map((config) => (
              <form key={config.provider} action={upsertIntegrationConfigAction} className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <input type="hidden" name="provider" value={config.provider} />
                <input type="hidden" name="organisationId" value={organisationId ?? ""} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="displayName" label="Display name" defaultValue={config.displayName} />
                  <Select name="status" label="Status" options={["ENABLED", "DISABLED", "MISCONFIGURED"]} defaultValue={config.status} />
                </div>
                <Textarea
                  name="nonSecretConfigJson"
                  label="Non-secret JSON"
                  defaultValue={JSON.stringify(config.nonSecretConfigJson ?? {}, null, 2)}
                />
                <p className="text-xs leading-5 text-zinc-500">
                  Secrets stay in environment variables. This field is for metadata such as channel names,
                  pipeline stages, owner notes, and routing labels.
                </p>
                <button className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  Save {config.provider}
                </button>
              </form>
            ))}
          </div>
        </section> : null}
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-zinc-500">
        <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function HealthRow({ label, ok, message, detail }: { label: string; ok: boolean; message: string; detail?: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-950">{label}</p>
        <span className={ok ? "text-xs font-semibold text-teal-700" : "text-xs font-semibold text-amber-700"}>
          {ok ? "OK" : "Action needed"}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{message}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function Input({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={6}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-zinc-950"
      />
    </label>
  );
}
