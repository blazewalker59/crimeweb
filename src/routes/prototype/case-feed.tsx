/**
 * PROTOTYPE — throwaway. Three variants of the v2 home screen, switchable via
 * `?variant=`, at /prototype/case-feed. Resolves nothing; issue #14 is HITL.
 *
 * The design question: Convergence (two or more Sources covering one Case inside
 * the 90-day window) is the product's differentiator, but it happens roughly
 * once every ten weeks. The feed must make a convergence unmistakable when it
 * occurs WITHOUT reserving permanent space that sits empty the rest of the time.
 *
 * Read-only. Data is src/routes/prototype/-fixture.ts, built from the real
 * ground truth in issue #9.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Flame, Radio, Sparkles } from "lucide-react";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { CASES, type FixtureCase } from "./-fixture";

const VARIANTS = [
  { key: "A", name: "Heat grid" },
  { key: "B", name: "Coverage timeline" },
  { key: "C", name: "Editorial ledger" },
];

export const Route = createFileRoute("/prototype/case-feed")({
  validateSearch: (s: Record<string, unknown>) => ({
    variant: (s.variant as string) ?? "A",
  }),
  component: CaseFeedPrototype,
});

const sorted = [...CASES].sort((a, b) => b.heat - a.heat);
const converged = (c: FixtureCase) => c.sourceCount90d >= 2;
const unwatched = (c: FixtureCase) => c.coverage.filter((x) => !x.viewed).length;
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function CaseFeedPrototype() {
  const { variant } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="pb-28">
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={(key) => navigate({ search: { variant: key }, replace: true })}
      />
    </div>
  );
}

/* ───────────────────────────── A — Heat grid ─────────────────────────────
 * Familiar dense card grid ranked by Heat. Convergence is carried by the card
 * itself: converged cases get a blood-red ring, a "2 SOURCES" ribbon, and their
 * source names stacked. Costs no layout when there is no convergence — the grid
 * simply contains no ringed cards that week.
 */
function VariantA() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">What's being covered</h1>
        <p className="text-chalk-muted mt-1">Cases ranked by recent coverage across sources.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((c) => (
          <article
            key={c.id}
            className={`relative rounded-xl p-4 bg-crime-surface transition-colors hover:bg-crime-elevated ${
              converged(c) ? "ring-2 ring-blood" : "ring-1 ring-white/5"
            }`}
          >
            {converged(c) && (
              <div className="absolute -top-2.5 left-4 rounded-full bg-blood px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-chalk">
                {c.sourceCount90d} sources
              </div>
            )}
            <div className="flex items-start justify-between gap-2 mt-1">
              <h2 className="font-semibold text-chalk leading-snug">{c.displayTitle}</h2>
              <span className="flex items-center gap-1 text-xs text-chalk-dim shrink-0">
                <Flame className="h-3 w-3" /> {c.heat}
              </span>
            </div>
            {c.isProvisional && (
              <span className="mt-2 inline-block rounded bg-tape/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tape">
                Provisional
              </span>
            )}
            <p className="mt-2 text-sm text-chalk-muted line-clamp-2">
              {c.summary ?? "No summary yet — minted from coverage."}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.coverage.map((cov) => (
                <span
                  key={cov.id}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    cov.viewed ? "bg-white/5 text-chalk-dim line-through" : "bg-white/10 text-chalk"
                  }`}
                >
                  {cov.sourceName}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-chalk-dim">
              <span>{fmt(c.lastCoverageAt)}</span>
              {unwatched(c) > 0 && <span className="text-tape">{unwatched(c)} unwatched</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── B — Coverage timeline ───────────────────────
 * Not ranked at all — chronological, one rail per week. Each Media Item is a
 * dot on the rail; when two dots land on the same Case they are drawn joined,
 * so convergence is visible as GEOMETRY rather than as a badge. Answers the
 * question structurally: nothing is reserved, the shape just appears.
 */
function VariantB() {
  const events = sorted
    .flatMap((c) => c.coverage.map((cov) => ({ ...cov, case: c })))
    .sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : -1));
  const byCase = new Map<string, number>();
  for (const e of events) byCase.set(e.case.id, (byCase.get(e.case.id) ?? 0) + 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-chalk">Coverage timeline</h1>
        <p className="text-chalk-muted mt-1">
          Every release, newest first. Joined markers are the same case.
        </p>
      </header>
      <ol className="relative border-l border-white/10 ml-3">
        {events.map((e, i) => {
          const isConverged = (byCase.get(e.case.id) ?? 0) > 1;
          const prev = events[i - 1];
          const joins = prev && prev.case.id === e.case.id;
          return (
            <li key={e.id} className="relative pl-6 pb-6">
              <span
                className={`absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full ring-4 ring-crime-black ${
                  isConverged ? "bg-blood" : "bg-chalk-dim"
                }`}
              />
              {joins && (
                <span className="absolute -left-[1.5px] -top-5 h-6 w-[3px] bg-blood" aria-hidden />
              )}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-chalk-dim tabular-nums">{fmt(e.releasedAt)}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-chalk">
                  <Radio className="h-3 w-3" />
                  {e.sourceName}
                </span>
                {e.viewed && <Eye className="h-3 w-3 text-chalk-dim" />}
              </div>
              <p className="mt-1 text-chalk">{e.title}</p>
              <p
                className={`mt-0.5 text-sm ${isConverged ? "text-blood-glow font-medium" : "text-chalk-muted"}`}
              >
                {e.case.displayTitle}
                {isConverged && " ← also covered elsewhere"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ─────────────────────── C — Editorial ledger ───────────────────────
 * Inverts the hierarchy: the RELATIONSHIP is the headline, the case is the
 * subhead. Converged rows read as a sentence ("20/20 and Dateline both covered
 * this — 0 days apart"); single-source rows are deliberately quieter and
 * smaller. No cards at all. Convergence is unmissable through typography and
 * rhythm rather than a reserved slot.
 */
function VariantC() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-chalk">The ledger</h1>
        <p className="text-chalk-muted mt-1">
          What the networks and streamers are covering, and where they overlap.
        </p>
      </header>
      <div className="divide-y divide-white/5">
        {sorted.map((c) => {
          if (!converged(c)) {
            return (
              <div key={c.id} className="flex items-baseline gap-3 py-3">
                <span className="text-sm text-chalk-muted shrink-0 w-24 tabular-nums">
                  {fmt(c.lastCoverageAt)}
                </span>
                <span className="text-sm text-chalk-muted">
                  <span className="text-chalk">{c.coverage[0].sourceName}</span> covered{" "}
                  <span className="text-chalk">{c.displayTitle}</span>
                </span>
                {c.isProvisional && (
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-tape shrink-0">
                    Provisional
                  </span>
                )}
              </div>
            );
          }
          const days = Math.abs(
            (new Date(c.coverage[c.coverage.length - 1].releasedAt).getTime() -
              new Date(c.coverage[0].releasedAt).getTime()) /
              86400000,
          );
          return (
            <div key={c.id} className="py-6">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blood-glow">
                <Sparkles className="h-3.5 w-3.5" />
                {c.sourceCount90d} sources converged
              </p>
              <h2 className="mt-2 text-2xl font-bold text-chalk leading-tight">
                {c.coverage.map((x) => x.sourceName).join(" and ")} both covered {c.displayTitle}
              </h2>
              <p className="mt-1 text-sm text-chalk-muted">
                {days === 0 ? "On the same day." : `${days} days apart.`} {c.summary ?? ""}
              </p>
              <ul className="mt-3 space-y-1">
                {c.coverage.map((cov) => (
                  <li key={cov.id} className="text-sm text-chalk-muted">
                    <span className="text-chalk-dim tabular-nums">{fmt(cov.releasedAt)}</span>{" "}
                    <span className="text-chalk">{cov.sourceName}</span> — {cov.title}
                    {cov.viewed && <span className="ml-2 text-chalk-dim">· watched</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
