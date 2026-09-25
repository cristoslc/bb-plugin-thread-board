---
type: checkpoint
timestamp: 2026-09-25T140541
responding-to: code review findings 1-8
---

## Checkpoint: code review findings 1–8 fixed (red-green where testable)

**Responding to:** code review findings 1–8 from the sashay closure-loop
review of the nested-cards branch.

Fixes, in finding order:

1. **Blocker — duplicated children.** New `assembleBoard(…)` in
   `components/nesting.ts` composes buildColumns → nestUnderParents and
   returns `{ columns, nestedChildrenByParent, childCountByParent }`. app.tsx
   now calls it once; the separate buildFamilyIndex memo is deleted. Nested
   rows render from the nesting result's map, so promoted and cross-axis
   children no longer render both as standalone cards and as child rows.
   Decision on the chip: plan decision 1 implemented — the parent card's
   child-count chip (and chevron) counts ALL visible children from the raw
   family index (`childCountByParent`), while rows render from the nesting
   map. Four new composition tests pin: promoted-only child → chip 1, zero
   nested rows; cross-axis child → standalone, not nested; nested child →
   exactly once.
2. **Button inside anchor.** `components/thread-card.tsx` restructured: the
   card is a container div; the anchor (state/time/title/branch) and the
   collapse toggle + count chip are siblings in a flex header row. Toggle no
   longer nests in the anchor; click behavior unchanged.
3. **Done-family dimming.** `doneIds` threaded through Board into ThreadCard →
   ChildRow: a done child row dims, and children of a done parent dim too
   (plan decision 8).
4. **Active child highlight.** ChildRow takes `isActive` (board's
   `activeThreadId`) and gets the same `ring-2 ring-ring` a standalone card
   gets, plus `aria-current`.
5. **Per-child `+N` chip.** Decision 3's per-child reading implemented: each
   level-1 child row with grandchildren shows its own `+N` chip
   (`grandchildCountFor`), opening that child's pane; the aggregate
   end-of-list chip is removed. `grandchildCountFor` is now load-bearing.
   Divergence from the plan's "What ships" wording noted in a new
   "Amendments" section of the plan doc.
6. **Tautological test.** The hidden-children test no longer re-asserts its
   own filter; it pins the caller contract (index built from the visible set
   nests only visible children) with a comment.
7. **Nits.** Pointless `useMemo` on `familyFiltered.dimmedIds` removed (used
   directly); `nestedKeys(nested)` hoisted above the column loop in
   `nestUnderParents`; duplicate `grandchildCountFor` assertion removed.
8. **Provider composition.** Symmetric provider-filter family test added
   (cross-provider child keeps the family, parent dimmed).

Docs: plan Amendments note; coverage-matrix rows updated (composition row
added, per-child depth cap, provider corner).

Gates: `npm test` 61 passed (61; was 55), `npx tsc --noEmit` clean.

**Commits in this unit:** ec3bee9 (this entry), 514394a, eb34d10, c929c2f