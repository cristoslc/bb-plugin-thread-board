---
type: checkpoint
session: bb-sashay-parent-child-nested-cards-thr_aap36j6yz4
iteration: 2
responding-to: iteration-2 review findings
timestamp: 2026-09-25T140932
---

# Checkpoint: iteration-2 review fixes

Two findings from the closure-loop re-review, both fixed.

## 1. Minor — chip disappears when every child is promoted

`components/thread-card.tsx`: the child-count chip was gated on `hasRows`
(nested rows exist), so a parent whose only visible children all promoted to
standalone columns (Done parent, Unread child, Attention grouping) lost its
chip — violating plan decision 1 (the chip counts every visible child).

Fix: the chip now renders whenever `chipCount > 0` (data already arrives via
`childCountByParent`); the chevron toggle stays gated on `hasRows`, so the
`aria-expanded` / `aria-label` attributes only exist when there are rows to
collapse.

RGR: extended the "chip vs rows divergence" test in `tests/nesting.test.ts` to
pin the logic-level contract explicitly — a promoted-only parent yields
`childCountByParent` 1 with zero nested rows. The render path is not
unit-testable at this suite level; the chip-count logic is pinned by that test
and the render gating follows from it (`chipCount > 0` vs `hasRows`).

## 2. Nit — buildFamilyIndex ran twice per assembly

`components/nesting.ts` `assembleBoard` called `buildFamilyIndex(threads)`
once inside itself (for chip counts) and again inside `nestUnderParents`.
Fix: `assembleBoard` now builds the index once and passes it through a new
optional trailing parameter on `nestUnderParents`; existing callers and tests
are unchanged (the parameter defaults to building from `threads`).

## Gates

- `npm test`: 2 files, 61 tests, all passing.
- `npx tsc --noEmit`: clean.

**Commits in this unit:** (filled below after commit)