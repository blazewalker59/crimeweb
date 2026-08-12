/**
 * PROTOTYPE — accepted design reference for the v2 correction surface (issue #15).
 *
 * Variant A (triage inbox) won on review. Variants B (side-by-side judgement)
 * and C (activity feed) are deleted, along with the variant switcher.
 *
 * A destination you visit, listing everything awaiting a human ordered by
 * confidence ascending — least certain first. That ordering is exactly what
 * `coverage_status_idx (status, confidence)` exists to serve in docs/v2-schema.md.
 *
 * Read-only; buttons are stubs. Data is ./-fixture.ts.
 * This is a design reference, not v2 — rewrite properly when v2 is built.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, GitMerge, Link2, X } from "lucide-react";
import { REVIEW_QUEUE } from "./-fixture";

export const Route = createFileRoute("/prototype/corrections")({
  component: Corrections,
});

const KIND = {
  coverage: { label: "Coverage link", icon: Link2, tone: "text-chalk" },
  duplicate: { label: "Duplicate", icon: GitMerge, tone: "text-tape" },
  merge: { label: "Merge cases", icon: GitMerge, tone: "text-tape" },
  enrichment: { label: "External link", icon: AlertTriangle, tone: "text-blood-glow" },
} as const;

function Corrections() {
  const queue = [...REVIEW_QUEUE].sort((a, b) => a.confidence - b.confidence);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Needs review</h1>
        <p className="text-chalk-muted mt-1">
          {queue.length} proposals below the confidence threshold. Least certain first.
        </p>
      </header>

      <ul className="space-y-3">
        {queue.map((r) => {
          const k = KIND[r.kind];
          const Icon = k.icon;
          return (
            <li key={r.id} className="rounded-xl bg-crime-surface ring-1 ring-white/5 p-4">
              <div className="flex items-center gap-2 text-xs">
                <Icon className={`h-3.5 w-3.5 ${k.tone}`} />
                <span className={`font-semibold uppercase tracking-wide ${k.tone}`}>{k.label}</span>
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
