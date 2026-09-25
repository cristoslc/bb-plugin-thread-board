---
type: checkpoint
timestamp: 2026-09-25T134333
responding-to: the sashay implementation task (all three units complete)
---

## Checkpoint: closing status update — parent-child nesting implemented

**Responding to:** the sashay implementation task; all three work units are
complete and pushed.

Per operator request: parent-child thread nesting ("nested cards,
Jira-subissue style") implemented on the Thread Board per the plan, red-first.

What shipped:

- `components/nesting.ts` (new, pure): `buildFamilyIndex`
  (order-independent cycle detection; cycle members and orphans render as
  roots; hidden/archived children never reach it because the caller passes
  the visible set), `nestUnderParents` (Attention promotion by state rank —
  never bury a Needs-you child; Done-parent children promote since Done is
  rightmost; axis-match for project/provider/machine; recency/none always
  nest), `filterFamilies` (any visible member matching keeps the family,
  non-matching members dimmed), `grandchildCountFor` (the `+N more` count).
- `components/grouping.ts`: `STATUS_COLUMN_ORDER` exported, pinned by a test.
- `app.tsx`: pipeline `visibleThreads → filterFamilies (filters + search) →
  buildColumns → nestUnderParents`; `childrenByParent` + `dimmedIds` passed
  to `Board`; frozen-column and done-column behavior intact.
- `components/board.tsx`: passes children, dimming, and the shared
  `menuActionsFor` path into each card; column counts and empty states count
  top-level cards only.
- `components/thread-card.tsx`: nested child rows (real anchors on the
  child's own `href`, state dot, truncated title, relative time), chevron +
  child-count chip with real-button `aria-expanded` toggle, in-memory
  per-card collapse (default expanded), `+N more` overflow chip, `dimmed`
  opacity.
- Tests: `tests/nesting.test.ts` (32 tests, written red first and observed
  failing), `tests/thread-fixture.ts` (shared fixture extracted from
  `tests/grouping.test.ts`).
- Docs: five new coverage-matrix rows; README nesting bullet under
  "What it does".

Gates at close: `npm test` 55 passed (55; was 23 at baseline), `npx tsc
--noEmit` clean.

Deferred (per plan, out of scope): sweep-family eligibility contract
(decision 5 — the sweep sashay owns it), collapse persistence (decision 7 —
in-memory by design), hidden-child rendering (excluded, aligned with the
sidebar).

**Commits in this unit:** 87c9c2e, 0c0d3ab (docs + chronicle); unit code
commits d74c04e, ac1345a