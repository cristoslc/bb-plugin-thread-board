---
type: checkpoint
timestamp: 2026-09-25T134316
responding-to: 2026-09-25T134255-intent-unit-c-docs.md
---

## Checkpoint: unit (c) — docs updated, implementation status update

**Responding to:** unit (c) intent: coverage matrix rows and README line.

Per operator request (sashay unit c): documentation shipped.

Results:

- `docs/test-coverage-matrix.md`: added the plan's five pre-test inventory
  rows (family index, Attention-grouping placement, axis groupings, depth
  cap, family-aware filter + search), each naming its coverage class and
  mechanism.
- `README.md`: one nesting bullet under "What it does" — collapsible child
  rows, needs-you promotion, family-aware filtering.

Gates: `npm test` 55 passed (55), `npx tsc --noEmit` clean.

**Commits in this unit:** 87c9c2e