// CLI-side sweep eligibility: the pure core of `bb focus-board sweep`.
//
// The board's own sweep logic (lib/sweep.ts) works on the sidebar's live
// thread view (PluginSidebarThread + threadState) and is not reusable
// server-side; the CLI works from the server-side thread rows and the
// board's Done records. Same semantics, different inputs:
//
// - Done arm: a thread whose done stamp is older than `doneArchiveDays`
//   and not kept (metadata keep OR the KV keep store) is eligible.
// - Idle arm: a thread with no Done record, not archived, not pinned, not
//   kept, whose last activity is older than `idleArchiveDays` is eligible.
// - Already-archived threads are never eligible; a Done thread below the
//   Done threshold is not claimed by the idle arm (Done threads are only
//   Done-arm candidates).
//
// `now` is always injected — no Date.now() here — so tests can pin time.

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface SweepThresholds {
  doneArchiveDays: number;
  idleArchiveDays: number;
}

/** One server-side thread row, resolved against the board's own state. */
export interface SweepFact {
  id: string;
  /** True when bb has already archived the thread. */
  archived: boolean;
  /** True when the thread is pinned (the idle arm never touches pins). */
  pinned: boolean;
  /** Last activity, epoch ms. */
  updatedAt: number;
  /** Done stamp, epoch ms — null when the thread is not marked Done. */
  doneAt: number | null;
  /** Merged keep override: metadata keep OR the KV keep store. */
  keep: boolean;
}

export type SweepReason = "done" | "idle";

export interface SweepEligible {
  id: string;
  reason: SweepReason;
}

/**
 * The sweep-eligible subset of `facts`, in input order. A thread at
 * exactly N days of age counts (age >= threshold), matching the board's
 * arm-time boundary.
 */
export function sweepCliEligible(
  facts: readonly SweepFact[],
  thresholds: SweepThresholds,
  now: number,
): SweepEligible[] {
  const doneThreshold = thresholds.doneArchiveDays * DAY_MS;
  const idleThreshold = thresholds.idleArchiveDays * DAY_MS;
  const eligible: SweepEligible[] = [];
  for (const fact of facts) {
    if (fact.archived) continue;
    if (fact.keep) continue;
    if (fact.doneAt !== null) {
      if (now - fact.doneAt >= doneThreshold) {
        eligible.push({ id: fact.id, reason: "done" });
      }
      continue; // Done threads are only Done-arm candidates.
    }
    if (!fact.pinned && now - fact.updatedAt >= idleThreshold) {
      eligible.push({ id: fact.id, reason: "idle" });
    }
  }
  return eligible;
}