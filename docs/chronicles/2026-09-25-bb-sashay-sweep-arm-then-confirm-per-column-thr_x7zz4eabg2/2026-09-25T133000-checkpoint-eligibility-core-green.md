---
type: checkpoint
timestamp: 2026-09-25T133000
responding-to: nothing (checkpoint after the eligibility-core work unit)
---

## Checkpoint: eligibility core green — 46 tests pass, typecheck clean

**Responding to:** nothing (results entry for the eligibility-core work
unit).

Red confirmed first: `tests/sweep.test.ts` failed on the missing
`lib/sweep.ts` with the existing 23 grouping tests still green. Then
implemented `lib/sweep.ts`:

- `DoneAgeSource` interface (`doneMarkedAt`, `kept`) — the clean seam for
  the future plugin-metadata swap from the done-state musing.
- `sweepCandidatesForDoneColumn` — done threads with a stamp, age ≥
  `doneArchiveDays` (default 7), not kept; undated threads never eligible;
  ordered newest-done first.
- `sweepCandidatesForIdleColumn` — idle-state threads (via `threadState`),
  age ≥ `idleArchiveDays` (default 30), not done, not pinned, not kept;
  ordered newest-activity first.
- `armSweep` / `confirmSweep` — frozen-list capture; `confirm(null)`
  archives nothing.

One test was wrong on first run, not the code: the frozen-list test gave the
"late" thread no done stamp in its `DoneAgeSource`, so it was never
eligible — the exclusion logic was right and the fixture was wrong. Fixed
the fixture (`doneSourceLate` stamps both ids); no product code changed for
that.

Results: 46/46 tests pass (23 grouping + 23 sweep), `npx tsc --noEmit`
clean.

**Commits in this unit:** (this entry posts before the code commit that
completes the unit)