---
type: checkpoint
timestamp: 2026-09-25T134243
responding-to: 2026-09-25T134103-intent-unit-b-ui-wiring.md
---

## Checkpoint: unit (b) — board UI wiring green

**Responding to:** unit (b) intent: wire nesting through app → board → card.

Per operator request (sashay unit b): pipeline rewired and nested-children UI
shipped.

Results:

- `app.tsx`: pipeline is now `visibleThreads → buildFamilyIndex →
  filterFamilies (filters + search together) → buildColumns →
  nestUnderParents`. `filterThreads` is no longer imported; search runs
  inside `filterFamilies` so a hit on any member keeps the family.
  `childrenByParent` and `dimmedIds` are passed to `Board`. Frozen-column
  capture and the done-column behavior are untouched (frozen columns still
  feed `buildColumns`; nesting removes only nested children from column
  lists).
- `components/board.tsx`: passes `childrenByParent` / `dimmedIds` into each
  `ThreadCard`, plus `onOpenThread` and `childMenuActions={menuActionsFor}`
  so child rows open the pane and get the same right-click actions. Column
  header counts and empty-state logic needed no change: nested children
  leave the column lists in `nestUnderParents`, so `column.threads.length`
  already counts top-level cards only.
- `components/thread-card.tsx`: optional `childThreads`, `childrenByParent`,
  `dimmed`, `onOpenThread`, `childMenuActions` props. Children render beneath
  the card body as indented compact rows (state dot via `threadState`,
  truncated title, relative time), each a real `<a>` on the child's own
  `href` with modified-click passthrough; the `+N more` overflow chip is a
  real button that opens the pane. Chevron toggle is a real button with
  `aria-expanded`, collapse is per-card in-memory state, default expanded.
  `dimmed` applies opacity to the whole family block.

Gates: `npm test` 55 passed (55), `npx tsc --noEmit` clean.

**Commits in this unit:** ac1345a