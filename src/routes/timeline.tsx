/**
 * The coverage timeline (issue #14, #24).
 *
 * Promotes the accepted prototype design (variant B) onto real Cases and
 * Coverage. The prototype lives at /prototype/case-feed and is deleted in #28,
 * along with the v1 home this replaces.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Radio } from "lucide-react";
import type { TimelineSibling } from "@/server/timeline";
import { Loading } from "@/components/common";
import { currentUser } from "@/server/auth";
import { listTimeline } from "@/server/timeline";

export const Route = createFileRoute("/timeline")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/signin" });
  },
  loader: async () => ({ events: await listTimeline() }),
  pendingComponent: () => <Loading message="Loading coverage..." />,
  component: Timeline,
});

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "undated";

/** "Also on Dateline" / "Also on Dateline +1" — names the source outright. */
function disclosureLabel(siblings: Array<TimelineSibling>) {
  const names = [...new Set(siblings.map((s) => s.sourceName))];
  return names.length === 1 ? `Also on ${names[0]}` : `Also on ${names[0]} +${names.length - 1}`;
}

function Timeline() {
  const { events } = Route.useLoaderData();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (events.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-chalk">Coverage timeline</h1>
        <p className="mt-3 text-chalk-muted">
          Nothing here yet. Ingest runs daily and populates this as episodes air.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-chalk">Coverage timeline</h1>
        <p className="text-chalk-muted mt-1">
          Every release, newest first. Expand a case to see where else it was covered.
        </p>
      </header>

      <ol className="relative border-l border-white/10 ml-3">
        {events.map((e) => {
          const isOpen = open.has(e.id);
          const converged = e.siblings.length > 0;
          return (
            <li key={e.id} className="relative pl-6 pb-6">
              <span
                className={`absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full ring-4 ring-crime-black ${
                  converged ? "bg-blood" : "bg-chalk-dim"
                }`}
                aria-hidden
              />

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-chalk-dim tabular-nums">{fmt(e.releasedAt)}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-chalk">
                  <Radio className="h-3 w-3" />
                  {e.sourceName}
                </span>
              </div>

              <p className="mt-1 text-chalk">{e.title}</p>

              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-chalk-muted">{e.caseTitle}</span>
                {e.isProvisional && (
                  <span className="rounded bg-tape/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tape">
                    Provisional
                  </span>
                )}
                {e.proposed && (
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-chalk-dim">
                    Unconfirmed
                  </span>
                )}
              </div>

              {converged && (
                <div className="mt-2">
                  <button
                    onClick={() => toggle(e.id)}
                    aria-expanded={isOpen}
                    aria-controls={`elsewhere-${e.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blood/15 px-2 py-1 text-xs font-semibold text-blood-glow ring-1 ring-blood/30 hover:bg-blood/25 transition-colors"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                    {disclosureLabel(e.siblings)}
                  </button>

                  {isOpen && (
                    <ul
                      id={`elsewhere-${e.id}`}
                      className="mt-2 space-y-2 border-l-2 border-blood/30 pl-3"
                    >
                      {e.siblings.map((s) => (
                        <li key={s.id} className="text-sm">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs text-chalk-dim tabular-nums">
                              {fmt(s.releasedAt)}
                            </span>
                            <span className="text-xs font-semibold text-chalk">{s.sourceName}</span>
                            {s.gapDays !== null && (
                              <span className="text-xs text-chalk-dim">
                                {s.gapDays === 0 ? "same day" : `${s.gapDays} days apart`}
                              </span>
                            )}
                          </div>
                          <p className="text-chalk-muted">{s.title}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
