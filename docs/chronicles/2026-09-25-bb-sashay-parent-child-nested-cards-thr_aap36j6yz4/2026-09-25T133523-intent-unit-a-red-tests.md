---
type: intent
timestamp: 2026-09-25T133523
responding-to: 2026-09-25T133435-intent-implement-parent-child-nested-cards.md (refines the first unit into red-test-first steps)
---

## Intent: unit (a) — red tests for nesting logic, then implement

**Responding to:** unit (a) of the implementation task: red tests first, then
`components/nesting.ts` + the `STATUS_COLUMN_ORDER` export.

Per operator request (the sashay task): write `tests/nesting.test.ts` covering
the plan's test plan — family index (links/orphans/cycles/hidden exclusion),
Attention-grouping promotion, axis-match groupings, depth cap, family-aware
filter/search with dimming, column accounting — run it red, then implement
`components/nesting.ts` (`buildFamilyIndex`, `nestUnderParents`,
`filterFamilies`, `grandchildCountFor`) and export `STATUS_COLUMN_ORDER` from
`components/grouping.ts` to turn it green.

Success: `npm test` green including the new file, `npx tsc --noEmit` passes,
no UI files touched yet.

**Commits in this unit:** none yet