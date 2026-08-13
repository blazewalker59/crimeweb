/**
 * Merge and the Provisional Case queue (issue #26).
 *
 * Side-by-side, because judging a merge needs both cases visible at once —
 * which no discovery surface provides. That was variant B of the
 * correction-surface prototype: it lost as the primary surface, but it is the
 * right shape for this particular decision.
 */
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Check, GitMerge } from "lucide-react";
import type { MergeCandidate } from "@/server/merge";
import { Loading } from "@/components/common";
import { currentUser } from "@/server/auth";
import {
  confirmProvisional,
  listMergeCandidates,
  listProvisionalCases,
  mergeCases,
} from "@/server/merge";

export const Route = createFileRoute("/merge")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/signin" });
  },
  loader: async () => ({
    pairs: await listMergeCandidates(),
    provisional: await listProvisionalCases(),
  }),
  pendingComponent: () => <Loading message="Loading merge queue..." />,
  component: Merge,
});

/**
 * Everything needed to judge a Case.
 *
 * A title and a coverage count are not enough — "Woman shot outside her
 * workplace, 1 coverage link" tells you nothing about whether it is real or
 * whether it duplicates another Case. The episode text is the evidence, so it
 * is shown in full.
 */
function CaseCard({ c }: { c: MergeCandidate }) {
  return (
    <div className="bg-crime-surface p-4">
      <h3 className="font-semibold text-chalk">{c.displayTitle}</h3>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-chalk-dim">
        {c.location && <span>{c.location}</span>}
        {c.occurredYear && <span className="tabular-nums">{c.occurredYear}</span>}
        {c.isProvisional && (
          <span className="rounded bg-tape/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-tape">
            Provisional
          </span>
        )}
      </div>

      {c.summary && <p className="mt-2 text-sm text-chalk-muted">{c.summary}</p>}

      {c.people.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {c.people.map((p) => (
            <li
              key={`${p.role}_${p.name}`}
              className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-chalk"
            >
              {p.name}
              <span className="ml-1 text-chalk-dim">{p.role}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-chalk-dim">
          {c.coverageCount} coverage link{c.coverageCount === 1 ? "" : "s"}
        </p>
        {c.coverage.map((cv, i) => (
          <div key={i} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-semibold text-chalk">{cv.sourceName}</span>
              <span className="text-xs text-chalk-dim tabular-nums">
                {cv.releasedAt ?? "undated"}
              </span>
              {cv.confidence !== null && (
                <span className="text-xs text-chalk-dim">{Math.round(cv.confidence * 100)}%</span>
              )}
              {cv.status === "proposed" && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-chalk-dim">
                  Unconfirmed
                </span>
              )}
            </div>
            <p className="text-chalk">{cv.mediaTitle}</p>
            {cv.mediaOverview && (
              <p className="mt-0.5 text-xs leading-relaxed text-chalk-muted">{cv.mediaOverview}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Merge() {
  const { pairs, provisional } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const doMerge = async (loserId: string, survivorId: string) => {
    setBusy(loserId);
    try {
      await mergeCases({ data: { loserId, survivorId } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  };

  const doConfirm = async (caseId: string) => {
    setBusy(caseId);
    try {
      await confirmProvisional({ data: caseId });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Merge cases</h1>
        <p className="text-chalk-muted mt-1">
          Cases sharing a named person. Extraction mints one Case per item, so the same incident
          described two ways lands twice — only a human can see they are one.
        </p>
      </header>

      {pairs.length === 0 ? (
        <p className="text-chalk-muted">No merge candidates.</p>
      ) : (
        <ul className="space-y-6">
          {pairs.map((p) => (
            <li key={`${p.left.caseId}_${p.right.caseId}`}>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blood-glow">
                <GitMerge className="h-3.5 w-3.5" />
                both name {p.sharedName}
              </p>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 md:grid-cols-2">
                <CaseCard c={p.left} />
                <CaseCard c={p.right} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy === p.right.caseId}
                  onClick={() => void doMerge(p.right.caseId, p.left.caseId)}
                  className="flex items-center gap-1.5 rounded-lg bg-blood px-3 py-1.5 text-sm font-medium text-chalk hover:bg-blood-light transition-colors disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-4 w-4" /> Keep left, merge right in
                </button>
                <button
                  disabled={busy === p.left.caseId}
                  onClick={() => void doMerge(p.left.caseId, p.right.caseId)}
                  className="flex items-center gap-1.5 rounded-lg bg-crime-elevated px-3 py-1.5 text-sm font-medium text-chalk hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-4 w-4" /> Keep right, merge left in
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-chalk-dim">
          Provisional cases ({provisional.length})
        </h2>
        <p className="mt-1 text-xs text-chalk-dim">
          Minted from coverage that could not be resolved. These are the routine output of ingest,
          not an error state — confirming one clears the flag.
        </p>
        <ul className="mt-3 space-y-4">
          {provisional.slice(0, 25).map((c) => (
            <li key={c.caseId} className="overflow-hidden rounded-xl ring-1 ring-white/10">
              <CaseCard c={c} />
              <div className="flex justify-end bg-crime-surface px-4 pb-4">
                <button
                  disabled={busy === c.caseId}
                  onClick={() => void doConfirm(c.caseId)}
                  className="flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-chalk hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Confirm as a real case
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
