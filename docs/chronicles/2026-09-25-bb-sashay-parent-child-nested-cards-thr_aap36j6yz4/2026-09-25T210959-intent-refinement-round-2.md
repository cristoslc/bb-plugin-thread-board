---
type: intent
timestamp: 2026-09-25T210959
responding-to: operator refinement request on merged PR #3 (thr_u6dkz2h77a)
---

## Intent: refinement round 2 — fat child rows, archived children, nesting toggle

**Responding to:** operator feedback on merged PR #3 (parent-child nested
cards), relayed from the parent thread with three refinements.

Plan addendum written: "Refinement round 2" section in
docs/plans/bb-sashay-parent-child-nested-cards-thr_aap36j6yz4.md names the
three changes and settles the edge cases — archived children never take
standalone column slots (archived overrides promotion and axis-match), an
archived family whose parent is archived vanishes whole, archived members
never contribute a filter match, chip counts include archived children, and
nesting OFF means a fully flat board (per-thread filtering, no chips, no `+N`,
archived children not rendered).

Branch: `bb/sashay-nesting-refinements-thr_aap36j6yz4` from main (305e4d9
lineage). First work unit: R2 + R3 logic in `components/nesting.ts`
(archived-inclusive family index, always-nest rule for archived children,
`nestingEnabled` assembly option) plus the pure toggle-parsing helper
(`components/preferences.ts`) — tests written red-first in
`tests/nesting.test.ts` and `tests/preferences.test.ts`.

Success: new tests green alongside the existing suite, `npx tsc --noEmit`
passes, no UI changes yet.

**Commits in this unit:** none yet