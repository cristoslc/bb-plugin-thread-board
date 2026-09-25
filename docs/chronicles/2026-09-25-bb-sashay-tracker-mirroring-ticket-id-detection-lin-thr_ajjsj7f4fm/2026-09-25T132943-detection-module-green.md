---
type: checkpoint
timestamp: 2026-09-25T132943
responding-to: nothing (work unit complete: detection module)
---

## Detection module green: `lib/tickets.ts` + 22 tests

**Responding to:** nothing (work unit complete: detection module)

TDD cycle complete for the pure detection module:

- Red: all 22 `tests/tickets.test.ts` cases written and failing first
  (`KEY_REF` lacked its `g` flag for `matchAll`; one expectation error
  where the test demanded `pull/45` URLs rewrite to `/issues/45` — fixed
  by preserving the original URL as href instead).
- Green: 22/22 pass; full suite 45/45; `tsc --noEmit` clean.
- Pattern set as planned: `PROJ-123` (uppercase key + digits, guarded
  against dates/versions/mid-word matches), `#N` (word-boundary guarded,
  `#0` rejected), full GitHub issue/PR URLs (fragment stripped from raw,
  pull URLs keep their own href).
- Dedup by raw text across title + branch (`extraText` option).

**Commits in this unit:** (this entry precedes the detection commit)