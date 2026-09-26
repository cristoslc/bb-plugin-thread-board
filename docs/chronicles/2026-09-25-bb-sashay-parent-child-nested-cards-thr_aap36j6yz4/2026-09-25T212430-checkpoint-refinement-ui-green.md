---
type: checkpoint
timestamp: 2026-09-25T212430
responding-to: 2026-09-25T212120-intent-refinement-ui-wiring.md
---

## Checkpoint: refinement UI wiring green (unit B closed)

- `components/thread-card.tsx`: ChildRow is now a fat row — compact
  card-like container (`rounded-md border bg-muted/40`), full title wrapping
  up to 2 lines (`line-clamp-2`, matching parent cards), state dot kept,
  pane-open on click kept, menu actions kept; no branch line, no project
  line, no drag handle. Archived rows render dimmed with an Archive icon and
  an "archived" label. Child-list gap widened to match the fatter rows.
- `components/board-toolbar.tsx`: checkbox-style "Nest child threads" toggle
  directly after the Group dropdown (`role="checkbox"`,
  `aria-checked`), checked square matching the multi-select dropdown's
  checkbox styling.
- `app.tsx`: the family pipeline now runs on the non-hidden set (archived
  included); `filterFamilies` when nesting is ON, `filterIndividually` when
  OFF; `assembleBoard` receives `nestingEnabled`; the toggle persists under
  `thread-board:nestChildren` (`parseNestStored`/`nestStoredValue`). Board
  counts (toolbar total, empty state) stay live-thread counts, so archived
  riders never inflate "N threads".
- README nest bullet + archived-threads paragraph updated;
  `docs/test-coverage-matrix.md` gains the refinement rows (R2/R3) and the
  family-index edge cell now reads "hidden excluded, archived included".

`npm test`: 82 passed · `npx tsc --noEmit`: clean. Next: push branch, open
WIP-draft PR, hand back to the operator thread for review.

**Commits in this unit:** UI wiring (thread-card, board-toolbar, app.tsx,
README, coverage matrix)