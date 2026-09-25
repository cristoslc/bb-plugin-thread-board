# Musing: Tracker integration without committing to a tracker

*2026-09-25 · split from the combined done/CLI/trackers musing · origin: a feature comparison against Deck, Autobahn, Agent Board, Taskboard, and Backlog.MD, where external-tracker integration showed up as the biggest real gap*

## The constraint

The operator does not commit to a single tracker: GitHub today, maybe Linear,
Jira, or plain files elsewhere. Any design that hardwires one tracker is
wrong the day the operator's next project uses a different one. Options,
loose to strict:

- **Adapter layer + per-project source selection** (Taskboard's model,
  applied generically). Each BB project picks a source — GitHub, Linear,
  Jira, Backlog.md, or none. The board gains a "Work" column fed by the
  chosen adapter; threads on cards stay native. Honest but a large build:
  every adapter is its own auth surface, cache, and reconciliation story.
- **Mirror, don't integrate.** Keep the board thread-first; show tracker
  signals as card metadata. Parse ticket IDs from titles/branches (Deck's
  `eng-482`, `#1284` search tokens are the model), link out, and — with the
  official GitHub plugin's RPC — show live issue/PR status on cards whose
  title/branch carries a reference. No tracker commitment; GitHub support is
  nearly free via the existing plugin; Linear/Jira need credentials the
  operator hasn't offered.
- **The thread-tags handshake.** Tags already exist as a bb-side convention
  via the thread-tags plugin. A card could show `tracker:eng-482` tags as
  links/status lines. Weakest version; no live status without per-tracker
  fetchers anyway.

## The lean

**Mirror, don't integrate** as step one: ticket-ID detection on cards (pure,
testable, zero credentials), link-out on click, then GitHub issue/PR status
through the official GitHub plugin's RPC for projects that have it mapped —
a real feature without owning a tracker abstraction. A full adapter layer is
a product of its own; if it ever lands, per-project source selection is the
proven shape (Taskboard), but start by watching whether the mirroring
satisfies the actual itch.

## Open questions

- Would GitHub status-on-card require polling, or can the GitHub plugin RPC
  be called cheaply per visible card?
- What ticket-ID patterns are worth recognizing beyond `PROJ-123` and
  `#1284` — and is there a false-positive risk worth guarding against?
- If mirroring proves insufficient, does the adapter layer start GitHub-only
  with the same RPC, or does per-project source selection come first?