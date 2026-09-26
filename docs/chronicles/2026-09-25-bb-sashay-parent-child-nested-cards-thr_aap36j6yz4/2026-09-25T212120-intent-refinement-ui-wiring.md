---
type: intent
timestamp: 2026-09-25T212120
responding-to: 2026-09-25T212022-checkpoint-refinement-logic-green.md
---

## Intent: refinement UI wiring (unit B)

**Responding to:** logic layer green (unit A).

Intent: wire the rendering surface —

1. `components/thread-card.tsx`: ChildRow upgraded to a fat row — full title
   wraps up to 2 lines (`line-clamp-2`, matching parent cards), compact
   card-like container, state dot kept, pane-open on click kept, menu
   actions kept; no branch/project line, no drag handle. Archived child rows
   get the archived treatment: dimmed + Archive icon + "archived" label.
2. `components/board-toolbar.tsx`: checkbox-style "Nest child threads"
   toggle next to the Group dropdown.
3. `app.tsx`: pipeline feeds the non-hidden set (archived included) into the
   family pipeline; `filterFamilies` when nesting is ON, `filterIndividually`
   when OFF; `assembleBoard` gets `nestingEnabled`; toggle persisted to
   localStorage via `parseNestStored`/`nestStoredValue`. Board counts
   (toolbar total, empty-state) stay live-thread counts (archived riders
   excluded).

Success: `npm test` and `npx tsc --noEmit` stay green; the toggle and
archived treatment are presentational so coverage is pinned by the logic
tests plus a manual visual check at handoff.

**Commits in this unit:** none yet