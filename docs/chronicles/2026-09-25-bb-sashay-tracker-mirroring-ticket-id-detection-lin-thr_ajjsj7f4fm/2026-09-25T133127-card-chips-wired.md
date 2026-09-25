---
type: checkpoint
timestamp: 2026-09-25T133127
responding-to: intent 2026-09-25T133008 (card chips + link-out wiring)
---

## Card chips + link-out wired; typecheck + suite green

**Responding to:** intent post for card chips + link-out wiring (same
work unit, complete).

- `components/thread-card.tsx`: new `TicketChip` (a chip, link variant
  with `target="_blank"` and `stopPropagation` — the card itself is an
  `<a>` to the thread); refs from `findTicketRefs(displayTitle,
  { extraText: branch, repoHrefBase })` render in a wrap row under the
  branch line.
- `components/board.tsx`: new `repoBaseFor` prop threaded to each card.
- `app.tsx`: one-shot `sdk.projects.list()` on mount builds
  `projectId → https://github.com/owner/repo` from `gitRemoteUrl`
  (non-GitHub remotes and fetch failure → no href, chips inert; the
  sidebar's `PluginSidebarProject` carries no remote, hence the extra
  list call).
- Green: `tsc --noEmit` clean, 45/45 tests pass.

**Commits in this unit:** (this entry precedes the wiring commit)
