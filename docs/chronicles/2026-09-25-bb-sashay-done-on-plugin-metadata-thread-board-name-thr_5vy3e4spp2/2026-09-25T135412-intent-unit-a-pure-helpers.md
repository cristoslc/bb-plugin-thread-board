---
type: intent
timestamp: 2026-09-25T135412
responding-to: PR #4 (sashay start)
---

## Intent: Unit A — lib/done-metadata.ts pure helpers

**Responding to:** [sashay start entry](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) (Unit A of three).

Writing failing tests first in `tests/done-metadata.test.ts` for the pure
record helpers: `parseDoneRecord` (valid record / absent → null / malformed
present value **throws** — inverse-assertion), `stampDone` (fresh `doneAt`,
preserves `keep`, works from null), `doneAtToEpochMs` (round-trip; null on
unparseable — inverse-assertion). Then implementing `lib/done-metadata.ts`
to green. No host dependency in this unit.

**Commits in this unit:** (pending)