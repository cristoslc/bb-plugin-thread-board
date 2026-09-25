/**
 * Sweep eligibility and arm-then-confirm semantics — pure logic, `now`
 * injected. The board's sweep is "archive old Done + long-idle", modeled on
 * the two-click arm-then-confirm pattern from docs/musings/2026-09-25-sweep.md.
 */
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { threadState } from "../components/grouping";

export const DEFAULT_DONE_ARCHIVE_DAYS = 7;
export const DEFAULT_IDLE_ARCHIVE_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Where Done ages come from. The done-state musing's final lean is bb-native
 * thread plugin metadata (stamped `doneAt`, optional `keep`); until that
 * sashay lands, the board implements this over its own KV store with
 * first-seen stamps. Threads with no known stamp are never eligible — the
 * sweep does not guess at ages.
 */
export interface DoneAgeSource {
  /** Epoch ms the thread was marked Done, or null when unknown. */
  doneMarkedAt(threadId: string): number | null;
  /** Per-thread keep-past-threshold override. */
  kept(threadId: string): boolean;
}

export interface SweepConfig {
  doneArchiveDays?: number;
  idleArchiveDays?: number;
  /** Idle-arm override lookup; the Done arm uses DoneAgeSource.kept. */
  kept?: (threadId: string) => boolean;
}

/**
 * Done-arm candidates: done threads whose done-marked age is >=
 * `doneArchiveDays` (default 7) and not overridden. Ordered newest-done
 * first so the gathered cards read most-recently-retired at the top.
 */
export function sweepCandidatesForDoneColumn(
  threads: readonly PluginSidebarThread[],
  doneIds: ReadonlySet<string>,
  doneSource: DoneAgeSource,
  config: SweepConfig,
  now: number,
): string[] {
  const threshold = (config.doneArchiveDays ?? DEFAULT_DONE_ARCHIVE_DAYS) * DAY;
  return threads
    .filter((thread) => doneIds.has(thread.id))
    .map((thread) => ({ id: thread.id, doneAt: doneSource.doneMarkedAt(thread.id) }))
    .filter((entry): entry is { id: string; doneAt: number } => entry.doneAt !== null)
    .filter((entry) => !doneSource.kept(entry.id) && now - entry.doneAt >= threshold)
    .sort((a, b) => b.doneAt - a.doneAt)
    .map((entry) => entry.id);
}

/**
 * Idle-arm candidates: idle-state (quiet, not done) threads whose last
 * activity is >= `idleArchiveDays` (default 30) ago, excluding pinned and
 * overridden threads. Ordered newest-activity first.
 */
export function sweepCandidatesForIdleColumn(
  threads: readonly PluginSidebarThread[],
  doneIds: ReadonlySet<string>,
  config: SweepConfig,
  now: number,
): string[] {
  const threshold = (config.idleArchiveDays ?? DEFAULT_IDLE_ARCHIVE_DAYS) * DAY;
  return threads
    .filter((thread) => !doneIds.has(thread.id) && !thread.isPinned)
    .filter((thread) => threadState(thread) === "idle")
    .filter((thread) => !(config.kept?.(thread.id) ?? false))
    .filter((thread) => now - thread.updatedAt >= threshold)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((thread) => thread.id);
}

export type SweepColumnKind = "done" | "idle-bucket";

export interface ArmedSweep {
  columnKind: SweepColumnKind;
  columnId: string;
  /** Frozen at arm time; late arrivals never join. */
  threadIds: readonly string[];
  armedAt: number;
}

/** Arm: capture the explicit, frozen list. Nothing moves until confirm. */
export function armSweep(
  columnId: string,
  candidateIds: readonly string[],
  now: number = Date.now(),
): ArmedSweep {
  return {
    columnKind: columnId === "done" ? "done" : "idle-bucket",
    columnId,
    threadIds: [...candidateIds],
    armedAt: now,
  };
}

/**
 * Confirm: return exactly the captured list to archive. `null` (click-away,
 * Escape, re-click elsewhere) disarms and archives nothing.
 */
export function confirmSweep(armed: ArmedSweep, confirm: string | null): string[] {
  return confirm === null ? [] : [...armed.threadIds];
}