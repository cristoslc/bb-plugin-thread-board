---
type: checkpoint
timestamp: 2026-09-25T140000
responding-to: code review findings 1-8 (fix unit results)
---

## Checkpoint: review findings fixed — 55 tests, typecheck clean, build passes

**Responding to:** code review findings 1-8 (fix unit per intent 135700).

All findings addressed:

1. **Frozen-list truth (HIGH):** Board now receives the full `armedSweep`
   object; while armed, count, gather, and highlight all render the FROZEN
   arm-time list. `sweepCandidatesFor` is consulted only pre-arm (the live
   propose) and at arm time (the capture). Confirm archives the frozen list
   — the blast radius the operator saw at arm time is exactly what confirm
   destroys. Covered by the existing frozen-list tests plus the new
   confirmSweep boolean contract.
2. **Keep store for both arms (HIGH):** server keeps overrides in a separate
   KV key (`sweep-keep-flags`, id → true) independent of Done marks;
   `sweep_keep_set` works for any thread id (no more throw for non-Done
   threads — the musing's "applies to long-idle cards too" now persists);
   `done_list` merges keep flags into `records` so the board reads one map.
   Both arms read the same `kept` lookup.
3. **Updater purity (MED):** the archive loop moved out of the setState
   updater; the armed snapshot is read from closure state, cleared, then
   archived — an updater re-invocation can no longer double-archive.
4. **Zero-count armed button (MED):** `isArmed` derives from the armed
   column alone; the button stays confirmable with the frozen count.
5. **Strict validators (MED):** `isDoneEntry` checks each known key
   independently and rejects unknown keys; the doneAt/keep disjunction hole
   is closed.
6. **Corrupt store logging (LOW):** readDone/readKept warn-log before
   resetting, so a wipe can never happen silently.
7. **Vacuous rejection test (LOW):** now parses through `rpcContract.…` and
   asserts `z.ZodError` specifically — a ReferenceError can no longer pass.
8. **Dupes/dead code (LOW):** server imports the defaults from
   `lib/sweep.ts` (one source of truth); `sweepColumnKind` replaces the
   three inline column-classification sites; ArmedSweep's dead
   `columnKind`/`armedAt` fields dropped; `confirmSweep` takes a boolean
   (its `confirm` parameter previously implied a match check that did not
   exist); done_set skips the no-op re-mark write+broadcast; the redundant
   optional guards in Board's eligible computation collapsed.

Deferred, with rationale: shared test-factory extraction (the 40-line
`thread()` builder duplicated across two test files) — mechanical DRY with
no behavioral risk; deferring keeps this fix unit focused on correctness
findings. Filed for the cleanup step.

Results: 55/55 tests pass, `npx tsc --noEmit` clean, build succeeds.

**Commits in this unit:** b2a7e24