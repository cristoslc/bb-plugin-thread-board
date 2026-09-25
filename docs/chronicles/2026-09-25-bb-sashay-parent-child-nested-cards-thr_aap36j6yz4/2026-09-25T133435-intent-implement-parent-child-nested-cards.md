---
type: intent
timestamp: 2026-09-25T133435
responding-to: nothing (intent post for next work unit)
---

## Intent: implement parent-child nested cards

**Responding to:** nothing (intent post for next work unit)

Per operator request: implement parent-child thread nesting on the Thread
Board as a sashay, per the plan. The plan answers the musing's open design
questions (promotion rule for column placement, axis-match rule for
cross-project/machine/provider children, two-level depth cap with `+N more`,
family-aware filtering with dimming, sweep-family contract recorded for the
sweep sashay, hidden children stay excluded).

Intent: first work unit is the pure logic layer —
`components/nesting.ts` (`buildFamilyIndex`, `nestUnderParents`,
`filterFamilies`, depth-cap count) with `tests/nesting.test.ts` written
red-first against the contract in the plan's test plan.

Success: `tests/nesting.test.ts` green, `npx tsc --noEmit` passes, no UI
changes yet.

**Commits in this unit:** none yet