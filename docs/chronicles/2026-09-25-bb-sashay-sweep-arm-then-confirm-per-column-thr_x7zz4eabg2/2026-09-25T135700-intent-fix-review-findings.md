---
type: intent
timestamp: 2026-09-25T135700
responding-to: code review findings (fix unit for the review loop)
---

## Intent: fix review findings — frozen-list truth, keep store, updater purity

**Responding to:** code review findings 1-8 (checkpoint 135500).

Fix unit plan, tests leading where contracts are testable:

- Red: a test asserting confirm/highlight use the *frozen* armed list even
  when live eligibility changes (finding 1) — `armSweep` captures, Board
  renders the frozen list while armed. Board's `sweepCandidatesFor` call
  becomes arm-time-only; while armed the passed frozen list wins.
- Red: keep flag persists for a non-Done (idle) thread (finding 2) — server
  keeps a separate keep KV map (`sweep-keep-flags`), `sweep_keep_set` works
  for any thread id, both arms read it; the Done-record `keep` migrates to
  the new store on read.
- Finding 3: move the archive loop out of the setState updater.
- Finding 4: isArmed from the armed column; button shows the frozen count.
- Finding 5: strict isDoneStore (per-key checks, unknown keys rejected).
- Finding 6: warn-log on corrupt store before resetting.
- Finding 7: fix the vacuous rejection test (rpcContract + ZodError).
- Finding 8: single source for threshold defaults (import from lib/sweep in
  server.ts), shared `sweepColumnKind` helper, drop ArmedSweep dead fields,
  confirmSweep takes boolean, shared test factory, skip no-op done_set
  write, drop redundant guards.

Success: all findings addressed or explicitly deferred with rationale;
suite green; typecheck clean.

**Commits in this unit:** none yet