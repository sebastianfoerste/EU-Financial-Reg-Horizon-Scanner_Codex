import { SignUp } from "@clerk/nextjs";

import { AppShell } from "@/components/app-shell";
import { getEnv } from "@/lib/env";

export default function SignUpPage() {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <AppShell>
        <section className="rounded-md border border-zinc-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Demo mode</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Clerk is not configured locally.</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Add Clerk environment variables to enable sign-up for this workspace.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <SignUp />
    </main>
  );
}
