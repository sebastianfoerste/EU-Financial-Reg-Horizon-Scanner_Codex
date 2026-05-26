"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-md border border-zinc-200 bg-white p-6">
        <CircleAlert className="h-5 w-5 text-amber-700" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold uppercase tracking-normal text-amber-800">Operational error</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          This view could not load its current data.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Check database and integration diagnostics, then retry the request. No external delivery was triggered.
        </p>
        {error.digest ? <p className="mt-3 font-mono text-xs text-zinc-500">Reference {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
          <Link
            href="/integrations"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Diagnostics
          </Link>
        </div>
      </section>
    </div>
  );
}
