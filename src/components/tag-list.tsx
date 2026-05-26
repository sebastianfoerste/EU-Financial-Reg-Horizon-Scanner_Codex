export function TagList({ tags, limit = 7 }: { tags: string[]; limit?: number }) {
  const visible = tags.slice(0, limit);
  const remaining = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex min-h-6 max-w-full items-center break-all rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700"
        >
          {tag}
        </span>
      ))}
      {remaining > 0 ? (
        <span className="inline-flex min-h-6 items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500">
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}
