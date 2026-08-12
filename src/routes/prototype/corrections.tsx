/**
 * PROTOTYPE — throwaway. Three variants of the correction surface, switchable
 * via `?variant=`, at /prototype/corrections. Resolves nothing; issue #15 is HITL.
 *
 * The design question: ADR-0002 ships no approval flow and no moderation queue —
 * the audit trail plus one-click reversal IS the entire error-correction
 * mechanism. So this surface carries a lot of weight, and the hardest part is
 * not the fixing but the NOTICING: with ~7 users and no moderation, how does
 * anyone find a wrong link in the first place?
 *
 * Read-only; buttons are stubs. Data is src/routes/prototype/-fixture.ts.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, GitMerge, Link2, Undo2, X } from "lucide-react";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { REVIEW_QUEUE } from "./-fixture";

const VARIANTS = [
  { key: "A", name: "Triage inbox" },
  { key: "B", name: "Side-by-side judgement" },
  { key: "C", name: "Activity feed" },
];

export const Route = createFileRoute("/prototype/corrections")({
  validateSearch: (s: Record<string, unknown>) => ({
    variant: (s.variant as string) ?? "A",
  }),
  component: CorrectionsPrototype,
});

const KIND = {
  coverage: { label: "Coverage link", icon: Link2, tone: "text-chalk" },
  duplicate: { label: "Duplicate", icon: GitMerge, tone: "text-tape" },
  merge: { label: "Merge cases", icon: GitMerge, tone: "text-tape" },
  enrichment: { label: "External link", icon: AlertTriangle, tone: "text-blood-glow" },
} as const;

function CorrectionsPrototype() {
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

/* ─────────────────────── A — Triage inbox ───────────────────────
 * A dedicated destination. Everything awaiting a human in one list, ordered by
 * confidence ascending (least certain first) — the ordering the schema's
 * coverage_status_idx on (status, confidence) exists to serve. Answers
 * "noticing" by making it a place you visit, like an inbox.
 */
function VariantA() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Needs review</h1>
        <p className="text-chalk-muted mt-1">
          {REVIEW_QUEUE.length} proposals below the confidence threshold. Least certain first.
        </p>
      </header>
      <ul className="space-y-3">
        {[...REVIEW_QUEUE]
          .sort((a, b) => a.confidence - b.confidence)
          .map((r) => {
            const k = KIND[r.kind];
            const Icon = k.icon;
            return (
              <li key={r.id} className="rounded-xl bg-crime-surface ring-1 ring-white/5 p-4">
                <div className="flex items-center gap-2 text-xs">
                  <Icon className={`h-3.5 w-3.5 ${k.tone}`} />
                  <span className={`font-semibold uppercase tracking-wide ${k.tone}`}>
                    {k.label}
                  </span>
                  <span className="ml-auto tabular-nums text-chalk-dim">
                    {Math.round(r.confidence * 100)}% confident
                  </span>
                </div>
                <p className="mt-3 text-chalk">
                  <span className="text-chalk-muted">{r.mediaSource}</span> · {r.mediaTitle}
                </p>
                <p className="text-sm text-chalk-muted mt-0.5">{r.mediaOverview}</p>
                <p className="mt-3 text-sm text-chalk">
                  <span className="text-chalk-dim">proposed →</span> {r.proposedCaseTitle}
                </p>
                <p className="mt-2 text-sm text-chalk-muted italic">{r.why}</p>
                <div className="mt-4 flex gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-chalk hover:bg-green-600 transition-colors">
                    <Check className="h-4 w-4" /> Confirm
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-crime-elevated px-3 py-1.5 text-sm font-medium text-chalk hover:bg-white/10 transition-colors">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/* ─────────────── B — Side-by-side judgement ───────────────
 * One decision at a time, the two things placed physically next to each other
 * so the judgement is possible at a glance — the thing no discovery surface
 * gives you. Deliberately narrow: it optimises the QUALITY of each call rather
 * than throughput, which matters because a wrong Merge is destructive and
 * reversal is the only safety net.
 */
function VariantB() {
  const r = [...REVIEW_QUEUE].sort((a, b) => a.confidence - b.confidence)[0];
  const k = KIND[r.kind];
  const Icon = k.icon;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-3xl font-bold text-chalk">Is this the same case?</h1>
        <span className="text-sm text-chalk-muted tabular-nums">1 of {REVIEW_QUEUE.length}</span>
      </header>

      <div className="flex items-center gap-2 text-xs mb-4">
        <Icon className={`h-4 w-4 ${k.tone}`} />
        <span className={`font-semibold uppercase tracking-wide ${k.tone}`}>{k.label}</span>
        <span className="text-chalk-dim">· {Math.round(r.confidence * 100)}% confident</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 rounded-xl overflow-hidden ring-1 ring-white/10">
        <div className="bg-crime-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-chalk-dim">
            This media item
          </p>
          <p className="mt-3 text-sm text-chalk-muted">{r.mediaSource}</p>
          <h2 className="text-xl font-bold text-chalk mt-1">{r.mediaTitle}</h2>
          <p className="mt-3 text-sm text-chalk-muted leading-relaxed">{r.mediaOverview}</p>
        </div>
        <div className="bg-crime-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-chalk-dim">
            Proposed case
          </p>
          <h2 className="text-xl font-bold text-chalk mt-4">{r.proposedCaseTitle}</h2>
          <p className="mt-3 text-sm text-chalk-muted leading-relaxed">
            Existing case with 1 confirmed coverage link.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-tape/10 ring-1 ring-tape/25 p-4">
        <p className="text-sm text-tape">
          <span className="font-semibold">Why it was proposed: </span>
          {r.why}
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 font-semibold text-chalk hover:bg-green-600 transition-colors">
          <Check className="h-5 w-5" /> Same case
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blood px-4 py-3 font-semibold text-chalk hover:bg-blood-light transition-colors">
          <X className="h-5 w-5" /> Different cases
        </button>
        <button className="rounded-lg bg-crime-elevated px-4 py-3 font-medium text-chalk-muted hover:text-chalk transition-colors">
          Skip
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── C — Activity feed ───────────────────────
 * Rejects the queue premise. Everything the graph does — machine and human
 * alike — streams here as it happens, each entry reversible in place. Nothing
 * waits for approval; you notice a wrong link by SEEING IT LAND, the way a team
 * chat surfaces problems. This is the only variant that directly serves
 * ADR-0002's "reversal is the whole mechanism", and the only one that shows
 * high-confidence auto-applied links at all.
 */
function VariantC() {
  const auto = REVIEW_QUEUE.filter((r) => r.confidence >= 0.6);
  const low = REVIEW_QUEUE.filter((r) => r.confidence < 0.6);
  const rows = [
    ...auto.map((r) => ({ ...r, applied: true })),
    ...low.map((r) => ({ ...r, applied: false })),
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Graph activity</h1>
        <p className="text-chalk-muted mt-1">
          Everything that changed, newest first. Anything here can be undone by anyone.
        </p>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => {
          const k = KIND[r.kind];
          const Icon = k.icon;
          return (
            <li
              key={r.id}
              className={`flex items-start gap-3 rounded-lg p-3 ${
                r.applied ? "bg-crime-surface" : "bg-tape/5 ring-1 ring-tape/20"
              }`}
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${k.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-chalk">
                  <span className="font-semibold">{r.applied ? "Auto-linked" : "Proposed"}</span>{" "}
                  <span className="text-chalk-muted">{r.mediaTitle}</span>{" "}
                  <span className="text-chalk-dim">→</span>{" "}
                  <span className="text-chalk-muted">{r.proposedCaseTitle}</span>
                </p>
                <p className="text-xs text-chalk-dim mt-0.5">
                  extraction pass · {Math.round(r.confidence * 100)}% confident · {r.why}
                </p>
              </div>
              {r.applied ? (
                <button className="flex items-center gap-1 rounded-md bg-crime-elevated px-2 py-1 text-xs font-medium text-chalk-muted hover:text-chalk transition-colors shrink-0">
                  <Undo2 className="h-3 w-3" /> Undo
                </button>
              ) : (
                <div className="flex gap-1 shrink-0">
                  <button className="rounded-md bg-green-700 p-1.5 text-chalk hover:bg-green-600 transition-colors">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button className="rounded-md bg-crime-elevated p-1.5 text-chalk-muted hover:text-chalk transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
