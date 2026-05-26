import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-md border border-zinc-200 bg-white p-6">
        <FileQuestion className="h-5 w-5 text-zinc-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold uppercase tracking-normal text-zinc-500">No record found</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          This publication or product map is unavailable.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          It may have been removed, archived, or referenced through an invalid link.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to publications
        </Link>
      </section>
    </div>
  );
}
