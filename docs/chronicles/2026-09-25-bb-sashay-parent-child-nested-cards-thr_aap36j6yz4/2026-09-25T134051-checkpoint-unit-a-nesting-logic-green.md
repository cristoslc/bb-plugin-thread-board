---
type: checkpoint
timestamp: 2026-09-25T134051
responding-to: 2026-09-25T133523-intent-unit-a-red-tests.md
---

## Checkpoint: unit (a) — nesting logic green

**Responding to:** unit (a) intent: red tests for the nesting contract, then
implement `components/nesting.ts` + the `STATUS_COLUMN_ORDER` export.

Per operator request (sashay unit a): wrote `tests/nesting.test.ts` first and
confirmed it red (module absent), then implemented to green.

Results:

- `tests/thread-fixture.ts` (new): shared `PluginSidebarThread` fixture,
  extracted from `tests/grouping.test.ts`; that file now imports it.
- `tests/nesting.test.ts` (new, 32 tests): family index
  (links/orphans/cycles/hidden-exclusion), Attention promotion (all plan
  cases incl. done-parent and in-column sort), axis groupings (project,
  machine, provider, recency, none), depth cap, family filter/search with
  dimming, promotion-after-filtering composition, column accounting.
- `components/grouping.ts`: exported `STATUS_COLUMN_ORDER` (pinned by a test).
- `components/nesting.ts` (new): `buildFamilyIndex` (order-independent cycle
  detection — members unlinked together so all render as roots),
  `nestUnderParents` (promotion via state rank; axis-match for
  project/provider/machine; recency/none always nest),
  `filterFamilies` (any-visible-member-passes keeps the family; non-matching
  members dimmed), `grandchildCountFor` (`+N more` count).
- Two test-side corrections during green: the `+N` chip count is read off the
  level-1 child (the parent's entry counts level-1 children), and one fixture
  timestamp crossed an age-bucket boundary (`NOW - 1h` is `idle-today`, not
  `idle-recent`).

Gates: `npm test` 55 passed (55), `npx tsc --noEmit` clean. No UI files
touched yet.

**Commits in this unit:** d74c04e