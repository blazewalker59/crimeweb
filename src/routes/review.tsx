/**
 * The correction surface — a triage inbox (issue #15, #25).
 *
 * Promotes the accepted prototype design (variant A). The prototype lives at
 * /prototype/corrections and is deleted in #28.
 *
 * Ordered by confidence ascending, least certain first — the ordering
 * `coverage_status_idx (status, confidence)` exists to serve.
 */
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Link2, Undo2, X } from "lucide-react";
import { Loading } from "@/components/common";
import { currentUser } from "@/server/auth";
import {
  confirmCoverage,
  listRecentlyReviewed,
  listReviewQueue,
  rejectCoverage,
  reverseReview,
} from "@/server/review";

export const Route = createFileRoute("/review")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/signin" });
  },
  loader: async () => ({
    queue: await listReviewQueue(),
    reviewed: await listRecentlyReviewed(),
  }),
  pendingComponent: () => <Loading message="Loading review queue..." />,
  component: Review,
});

function Review() {
  const { queue, reviewed } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, fn: (opts: { data: string }) => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn({ data: id });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-chalk">Needs review</h1>
        <p className="text-chalk-muted mt-1">
          {queue.length === 0
            ? "Nothing awaiting review."
            : `${queue.length} proposal${queue.length === 1 ? "" : "s"} below the confidence threshold. Least certain first.`}
        </p>
      </header>

      <ul className="space-y-3">
        {queue.map((r) => (
          <li key={r.coverageId} className="rounded-xl bg-crime-surface ring-1 ring-white/5 p-4">
            <div className="flex items-center gap-2 text-xs">
              <Link2 className="h-3.5 w-3.5 text-chalk" />
              <span className="font-semibold uppercase tracking-wide text-chalk">
                Coverage link
              </span>
              <span className="ml-auto tabular-nums text-chalk-dim">
                {r.confidence === null ? "—" : `${Math.round(r.confidence * 100)}% confident`}
              </span>
            </div>

            <p className="mt-3 text-chalk">
              <span className="text-chalk-muted">{r.sourceName}</span> · {r.mediaTitle}
            </p>
            {r.mediaOverview && (
              <p className="text-sm text-chalk-muted mt-0.5">{r.mediaOverview}</p>
            )}

            <p className="mt-3 text-sm text-chalk">
              <span className="text-chalk-dim">proposed →</span> {r.caseTitle}
              {r.caseIsProvisional && (
                <span className="ml-2 rounded bg-tape/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tape">
                  Provisional
                </span>
              )}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                disabled={busy === r.coverageId}
                onClick={() => void act(r.coverageId, confirmCoverage)}
                className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-chalk hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Confirm
              </button>
              <button
                disabled={busy === r.coverageId}
                onClick={() => void act(r.coverageId, rejectCoverage)}
                className="flex items-center gap-1.5 rounded-lg bg-crime-elevated px-3 py-1.5 text-sm font-medium text-chalk hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>

      {reviewed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-chalk-dim">
            Recently reviewed
          </h2>
          <p className="mt-1 text-xs text-chalk-dim">
            Anyone on the invite list can undo any of these. There is no approval queue — the audit
            trail and reversal are the whole correction mechanism.
          </p>
          <ul className="mt-3 space-y-2">
            {reviewed.map((r) => (
              <li
                key={r.auditId}
                className="flex items-start gap-3 rounded-lg bg-crime-surface p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-chalk">
                    <span className="font-semibold capitalize">{r.action}</span>{" "}
                    <span className="text-chalk-muted">{r.mediaTitle}</span>{" "}
                    <span className="text-chalk-dim">→</span>{" "}
                    <span className="text-chalk-muted">{r.caseTitle}</span>
                  </p>
                  <p className="text-xs text-chalk-dim">{new Date(r.at).toLocaleString()}</p>
                </div>
                {r.action !== "reverse" && (
                  <button
                    disabled={busy === r.auditId}
                    onClick={() => void act(r.auditId, reverseReview)}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-crime-elevated px-2 py-1 text-xs font-medium text-chalk-muted hover:text-chalk transition-colors disabled:opacity-50"
                  >
                    <Undo2 className="h-3 w-3" /> Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
