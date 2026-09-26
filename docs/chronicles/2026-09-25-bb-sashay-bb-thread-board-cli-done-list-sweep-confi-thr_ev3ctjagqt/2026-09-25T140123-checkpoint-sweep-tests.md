---
type: checkpoint
timestamp: 2026-09-25T140123
responding-to: intent 2026-09-25T140040 (sweep tests)
---

## Checkpoint: sweep CLI tested — dry-run, confirm, frozen-list, keep rules

**Responding to:** the unit-3 intent — pin the sweep's confirmation
surface and eligibility rules.

What shipped in commit `38afbf3`:

- `tests/sweep-cli.test.ts` (14 tests) — dry-run prints id/reason and
  exits 1 with zero `threads.archive` calls (including the no-eligible
  case); exactly-at-threshold eligible; keep and already-archived
  excluded from the print; done-below-threshold not re-claimed as idle;
  `--ids` narrows the dry-run; `--confirm` archives exactly the resolved
  set (argument lists asserted through `harness.inspection.sdk.callsTo`);
  `--ids` + `--confirm` archives exactly the named ids even when others
  also qualify (frozen-list semantics) and skips already-archived ones;
  keep threads and migrated (unstamped) records never archived; a
  `config set idleArchiveDays 14` write changes the sweep's resolution;
  `--ids` without a value is a parser failure.

No server.ts changes were needed — the sweep implementation from unit 1
already satisfied every rule.

Tests: `npm test` 89 passed (89), `npx tsc --noEmit` clean.

**Commits in this unit:** 38afbf3