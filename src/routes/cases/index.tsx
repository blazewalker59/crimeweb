/**
 * Cases index — the first end-to-end read from D1.
 *
 * Deliberately plain: this slice proves schema -> query -> UI works. The real
 * home screen is the coverage timeline in #24.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { Loading } from "@/components/common";
import { listCasesByHeat } from "@/server/cases";

export const Route = createFileRoute("/cases/")({
  loader: async () => ({ cases: await listCasesByHeat() }),
  pendingComponent: () => <Loading message="Loading cases..." />,
  component: CasesIndex,
});

function CasesIndex() {
  const { cases } = Route.useLoaderData();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Cases</h1>
        <p className="text-chalk-muted mt-1">
          {cases.length} {cases.length === 1 ? "case" : "cases"}, ranked by Heat.
        </p>
      </header>

      {cases.length === 0 ? (
        <p className="text-chalk-muted">No cases yet. Ingest populates these once it lands.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {cases.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-chalk">{c.displayTitle}</h2>
                <span className="flex items-center gap-1 text-xs text-chalk-dim shrink-0">
                  <Flame className="h-3 w-3" />
                  {c.heat.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {c.isProvisional && (
                  <span className="rounded bg-tape/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-tape">
                    Provisional
                  </span>
                )}
                {c.location && <span className="text-chalk-dim">{c.location}</span>}
                {c.occurredYear && <span className="text-chalk-dim">{c.occurredYear}</span>}
                <span className="text-chalk-dim">
                  {c.sourceCount90d} {c.sourceCount90d === 1 ? "source" : "sources"}
                </span>
              </div>
              {c.summary && <p className="mt-2 text-sm text-chalk-muted">{c.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
