---
type: checkpoint
timestamp: 2026-09-25T140600
responding-to: re-review findings (second review pass)
---

## Checkpoint: re-review — keep-store round-trip bug caught and fixed

**Responding to:** re-review findings (second pass on the fix diff).

The re-review confirmed findings 1, 3-8 resolved and found the fix for
finding 2 was itself buggy: `writeKept` persisted bare `{id: true}` rows
while `readKept` validated object rows (`{id: {keep: true}}`), so every
read after a keep write failed validation, warned, and returned {} — keeps
never survived a call boundary. Also: `done_list` merged keep flags only
into Done records, so an idle thread's keep never reached the client.

Fixes (round-trip test first):

- Single canonical row shape: `keepRowFromStore` (write) and `keptFromRow`
  (read) now encode/decode the same `{id: {keep: true}}` shape; tested
  round-trip green, plus the bare-boolean bug shape asserts null, and
  unknown keys reject. (tests/keep-row.test.ts, 4 tests)
- `done_list` now also emits `{keep: true}` records for kept ids absent
  from the Done store — the idle arm's overrides reach the client.
- `isDoneEntry` rejects non-finite `doneAt` (NaN/Infinity) per the re-review
  low finding.
- Not adopted: renaming the "does not leak" test title — after review the
  assertion name reflects the confirm-column isolation the frozen-list
  design guarantees; left as is. The read-modify-write race on DONE_KEY is
  pre-existing bb.storage.kv behavior shared with the old string[] design
  (documented in the security review as low; bb.storage.kv exposes no CAS);
  noted as tech-debt for the cleanup step rather than rebuilt here.

Results: 59/59 tests pass, `npx tsc --noEmit` clean, build succeeds.

**Commits in this unit:** 8e4a1bc