---
type: review-response
timestamp: 2026-09-25T134900
responding-to: sashay closure-loop code review of the nested-cards diff (origin/main…branch)
---

## Checkpoint: code review findings recorded

**Responding to:** sashay closure-loop code review of the nested-cards
branch against rebased origin/main.

Per the closure loop, the mandatory PR-level review ran. Gates confirmed
clean by the reviewer (`npm test` 55/55, `npx tsc --noEmit` pass). Findings:

1. **Blocker** — `app.tsx` builds `childrenByParent` from
   `buildFamilyIndex` instead of the map `nestUnderParents` returns, so
   promoted and cross-axis children render both standalone and nested
   (duplicated cards). The tested invariant exists but the wiring bypasses
   it. Fix: reuse the nesting result's `childrenByParent`.
2. Minor — collapse toggle `<button>` nested inside the parent `<a>`
   (invalid HTML; click handling is correct).
3. Minor — done-family dimming (plan decision 8) not applied to child rows.
4. Minor — an open nested child loses its active ring highlight.
5. Minor — `grandchildCountFor` exported/tested but unused; the chip
   aggregates grandchildren across level-1 children, which is the ship
   spec's wording but not decision 3's per-child wording.
6. Minor — hidden-children test asserts on its own filter (tautological).
7. Nit — pointless `useMemo` in `app.tsx`; hoistable `nestedKeys`; dup test
   assertion.
8. Nit — provider-filter composition test missing (only project covered).

Review verdict: actionable. Dispatching a fix agent (RGR discipline) for
findings 1-8, then rebase, re-test, re-review.

**Commits in this unit:** none yet