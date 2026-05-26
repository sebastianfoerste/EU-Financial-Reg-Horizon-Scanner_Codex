import { Search } from "lucide-react";

type FilterData = {
  sources: [string, string][];
  publicationTypes: string[];
  tags: string[];
};

export function PublicationFilters({
  filters,
  filterData,
}: {
  filters: { source?: string; type?: string; tag?: string; query?: string; bucket?: string; from?: string; to?: string };
  filterData: FilterData;
}) {
  return (
    <form className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1fr_auto]">
      <label className="relative block">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
        <input
          name="query"
          defaultValue={filters.query ?? ""}
          placeholder="Search title, summary, body"
          className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-950"
        />
      </label>

      <label>
        <span className="sr-only">Source</span>
        <select
          name="source"
          defaultValue={filters.source ?? ""}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
        >
          <option value="">All sources</option>
          {filterData.sources.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Publication type</span>
        <select
          name="type"
          defaultValue={filters.type ?? ""}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
        >
          <option value="">All types</option>
          {filterData.publicationTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Tag</span>
        <select
          name="tag"
          defaultValue={filters.tag ?? ""}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
        >
          <option value="">All tags</option>
          {filterData.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Impact bucket</span>
        <select
          name="bucket"
          defaultValue={filters.bucket ?? ""}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
        >
          <option value="">All impact</option>
          <option value="HIGH">Critical and high</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="NONE">None</option>
        </select>
      </label>

      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
        <Search className="h-4 w-4" aria-hidden="true" />
        Filter
      </button>
    </form>
  );
}
