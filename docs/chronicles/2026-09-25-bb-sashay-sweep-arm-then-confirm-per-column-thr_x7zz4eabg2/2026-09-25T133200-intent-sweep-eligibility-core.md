---
type: intent
timestamp: 2026-09-25T133200
responding-to: nothing (intent post for the first implementation work unit)
---

## Intent: sweep eligibility core (lib/sweep.ts) — tests first

**Responding to:** nothing (intent post for next work unit).

Per operator request: implement the sweep. First work unit is the pure
eligibility core, red-green: write `tests/sweep.test.ts` covering Done-arm
eligibility (stamp age vs `doneArchiveDays`, keep flag, no-stamp never
eligible), idle-arm eligibility (idle state only, `idleArchiveDays` default
30, pinned excluded, done threads not claimed by the idle arm), the frozen
arm-list semantics (late arrivals excluded, disarm archives nothing, confirm
archives exactly the captured list), threshold boundary (exactly N days is
eligible), and the keep-flag set/clear round-trip. Implementation lands in
`lib/sweep.ts` with `now` injected — no `Date.now()` in pure code.

Success: `npm test` green with the new suite, `npx tsc --noEmit` clean.

**Commits in this unit:** none yet