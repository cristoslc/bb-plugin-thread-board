---
type: intent
timestamp: 2026-09-25T134103
responding-to: 2026-09-25T134051-checkpoint-unit-a-nesting-logic-green.md
---

## Intent: unit (b) — wire nesting through the board UI

**Responding to:** unit (b) of the implementation task: app/board/card wiring.

Per operator request (sashay unit b): change the app.tsx pipeline to
`visibleThreads → filterFamilies → search → buildColumns → nestUnderParents`,
pass `childrenByParent` and `dimmedIds` down through `Board` into
`ThreadCard`, and build the nested-children UI: indented compact child rows
(state dot, truncated title, relative time), each an anchor on the child's
own `href` with click-to-open and the same `menuActionsFor` right-click path;
chevron + child-count chip in the parent header; per-card in-memory collapse
(default expanded, real button with `aria-expanded`); `+N more` chip when
grandchildren exist; `dimmed` opacity prop. Column header counts and
empty-state logic count top-level cards only (they already do, since nested
children leave the column lists).

Success: all tests green, `npx tsc --noEmit` clean, frozen-column and
done-column behavior untouched.

**Commits in this unit:** none yet