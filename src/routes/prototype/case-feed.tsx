/**
 * PROTOTYPE — accepted design reference for the v2 home screen (issue #14).
 *
 * Variant B (coverage timeline) won on review. Variants A (heat grid) and C
 * (editorial ledger) are deleted, along with the variant switcher.
 *
 * Change requested on review: the flat "← also covered elsewhere" line was
 * clunky. Replaced with an expandable disclosure that reveals *where* else the
 * case was covered. The old joined-marker line is also gone — it only rendered
 * when two events for one case happened to fall adjacent in the date sort, so it
 * almost never appeared.
 *
 * Read-only. Data is ./-fixture.ts, built from the real ground truth in issue #9.
 * This is a design reference, not v2 — rewrite properly when v2 is built.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Eye, Radio } from "lucide-react";
import { CASES, type FixtureCase, type FixtureCoverage } from "./-fixture";

export const Route = createFileRoute("/prototype/case-feed")({
  component: CaseFeed,
});

interface Event extends FixtureCoverage {
  case: FixtureCase;
  siblings: FixtureCoverage[];
}

const EVENTS: Event[] = CASES.flatMap((c) =>
  c.coverage.map((cov) => ({
    ...cov,
    case: c,
    siblings: c.coverage.filter((o) => o.id !== cov.id),
  })),
).sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : -1));

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const daysBetween = (a: string, b: string) =>
  Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000);

/** "Also on Dateline" / "Also on Dateline +1" — names the source rather than hinting at it. */
function disclosureLabel(siblings: FixtureCoverage[]) {
  const names = [...new Set(siblings.map((s) => s.sourceName))];
  return names.length === 1 ? `Also on ${names[0]}` : `Also on ${names[0]} +${names.length - 1}`;
}

function CaseFeed() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-chalk">Coverage timeline</h1>
        <p className="text-chalk-muted mt-1">
          Every release, newest first. Expand a case to see where else it was covered.
        </p>
      </header>

      <ol className="relative border-l border-white/10 ml-3">
        {EVENTS.map((e) => {
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
                {e.viewed && (
                  <span className="flex items-center gap-1 text-xs text-chalk-dim">
                    <Eye className="h-3 w-3" /> watched
                  </span>
                )}
              </div>

              <p className="mt-1 text-chalk">{e.title}</p>

              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-chalk-muted">{e.case.displayTitle}</span>
                {e.case.isProvisional && (
                  <span className="rounded bg-tape/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tape">
                    Provisional
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
                      {e.siblings
                        .slice()
                        .sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : -1))
                        .map((s) => {
                          const gap = daysBetween(s.releasedAt, e.releasedAt);
                          return (
                            <li key={s.id} className="text-sm">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-xs text-chalk-dim tabular-nums">
                                  {fmt(s.releasedAt)}
                                </span>
                                <span className="text-xs font-semibold text-chalk">
                                  {s.sourceName}
                                </span>
                                <span className="text-xs text-chalk-dim">
                                  {gap === 0 ? "same day" : `${gap} days apart`}
                                </span>
                                {s.viewed && <Eye className="h-3 w-3 text-chalk-dim" />}
                              </div>
                              <p className="text-chalk-muted">{s.title}</p>
                            </li>
                          );
                        })}
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
