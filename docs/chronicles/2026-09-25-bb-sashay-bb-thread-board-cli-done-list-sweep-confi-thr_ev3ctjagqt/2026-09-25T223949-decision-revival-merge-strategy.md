---
type: decision
timestamp: 2026-09-25T223949
responding-to: revival brief from parent thread thr_u6dkz2h77a after the server restart
---

## Decision: revival merge strategy — main's storage wins, CLI layer appends

**Responding to:** revival brief from thr_u6dkz2h77a — main advanced past
this branch (PRs #4/#1/#2/#5 merged, release 0.2.0) while the CLI sat
green but unmerged on this branch (11 ahead, 10 behind).

Trunk now contains its own `lib/done-metadata.ts` (PR #4: required
`doneAt`, throwing `parseDoneRecord`, `stampDone(existing, now)`), the
sweep sibling's KV keep store (`sweep-keep-flags`, keep for never-done
threads) and RPCs (`sweep_config_get`, `sweep_keep_set`), tracker
mirroring, and `lib/sweep.ts` with `DEFAULT_DONE_ARCHIVE_DAYS`/`DEFAULT_IDLE_ARCHIVE_DAYS`.
My pre-revival build diverged in four ways; main's version wins each
time, per the brief's "take main's server wholesale and append your CLI
registration":

1. **doneAt optionality.** Mine allowed `doneAt` absent (unknown-age
   migrated records). Main stamps legacy ids at import, so unknown-age
   records no longer exist. CLI treats `doneAt` as always present; my
   `sweepEligible`/`SweepEligibleThread` variants are dropped in favor of
   CLI-side eligibility in a new `lib/sweep-cli.ts` built on main's
   `DoneRecord` + the KV keep store (main's `lib/sweep.ts` is
   board-view-shaped — PluginSidebarThread + threadState — and not
   reusable server-side).
2. **Keep flag location.** Main stores keep for never-done threads in
   KV and inside the done record for done ones; `done_list` merges both.
   CLI `done list`/`sweep` honor both sources; `done clear` leaves the
   KV keep flag intact (clear ≠ allow-sweep).
3. **Realtime payload.** Main publishes `{ threadId, done }`; CLI writes
   adopt that shape.
4. **done-index KV.** Mine added a `done-index` KV row so `done list`
   can report marks on threads deleted or absent from `threads.list`
   (no metadata scan in the SDK). Main has no equivalent; the index
   stays as an additive CLI-side helper — metadata stays the truth, the
   index only widens reporting of orphaned marks.

The rebase is executed as a tree rebuild: reset the branch to
origin/main, then re-apply the CLI layer + tests + docs as clean commits
with chronicle interleaving. The branch is squash-merged at step 11, so
per-commit granularity on the branch is review surface, not trunk
history; the original pre-revival branch is preserved as
`bb/backup-cli-impl` for the retro's bookend citation.

**Commits in this unit:** none yet