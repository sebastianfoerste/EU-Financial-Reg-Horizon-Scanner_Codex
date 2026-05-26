"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

export function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <span className="inline-flex h-9 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-900">
        Demo mode
      </span>
    );
  }

  return <ClerkAuthControls />;
}

function ClerkAuthControls() {
  const { isSignedIn } = useUser();

  if (isSignedIn) return <UserButton />;

  return (
    <SignInButton mode="modal">
      <button className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in
      </button>
    </SignInButton>
  );
}
