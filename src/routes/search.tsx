import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { currentUser } from "@/server/auth";
import { search } from "@/server/search";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) ?? "" }),
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/signin" });
  },
  loaderDeps: ({ search: s }) => ({ q: s.q }),
  loader: async ({ deps }) => (deps.q ? await search({ data: deps.q }) : { cases: [], media: [] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { cases, media } = Route.useLoaderData();
  const navigate = Route.useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-chalk">Search</h1>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          void navigate({ search: { q: String(value ?? "") } });
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="A case, a victim, an episode…"
          className="flex-1 rounded-lg bg-crime-surface px-3 py-2 text-chalk ring-1 ring-white/10 placeholder:text-chalk-dim focus:outline-none"
        />
        <button className="flex items-center gap-1.5 rounded-lg bg-blood px-4 py-2 font-medium text-chalk hover:bg-blood-light transition-colors">
          <SearchIcon className="h-4 w-4" /> Search
        </button>
      </form>

      {q && cases.length === 0 && media.length === 0 && (
        <p className="mt-8 text-chalk-muted">Nothing matched “{q}”.</p>
      )}

      {cases.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-chalk-dim">
            Cases ({cases.length})
          </h2>
          <ul className="mt-3 divide-y divide-white/5">
            {cases.map((c) => (
              <li key={c.id} className="py-3">
                <p className="font-semibold text-chalk">{c.displayTitle}</p>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-chalk-dim">
                  {c.location && <span>{c.location}</span>}
                  <span>
                    {c.sourceCount90d} source{c.sourceCount90d === 1 ? "" : "s"} in window
                  </span>
                  {c.isProvisional && (
                    <span className="rounded bg-tape/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-tape">
                      Provisional
                    </span>
                  )}
                </div>
                {c.summary && <p className="mt-1 text-sm text-chalk-muted">{c.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {media.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-chalk-dim">
            Episodes and films ({media.length})
          </h2>
          <ul className="mt-3 divide-y divide-white/5">
            {media.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-baseline gap-2 text-xs text-chalk-dim">
                  <span className="font-semibold text-chalk">{m.sourceName}</span>
                  {m.releasedAt && <span className="tabular-nums">{m.releasedAt}</span>}
                </div>
                <p className="text-chalk">{m.title}</p>
                {m.caseTitle && <p className="text-sm text-chalk-muted">{m.caseTitle}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-xs text-chalk-dim">
        <Link to="/timeline" className="hover:text-chalk">
          ← Back to the timeline
        </Link>
      </p>
    </div>
  );
}
