# Musing: Done state, a CLI command, and tracker integration

*2026-09-25 · after a feature comparison against Deck, Autobahn, Agent Board, Taskboard, and Backlog.MD*

## Correction to the comparison

The comparison called this board "strictly read-only / makes no server-side
writes." That was README language, not code truth. `app.tsx` already calls
`experimental_useSidebarThreadActions().setPinned()`, which writes bb's own
server-side pin state, and the Attention grouping already supports dropping a
card onto the Unread column. So the board writes through **bb's native thread
actions**; what it never writes is its *own* plugin state.

## Server-side Done

The asymmetry worth fixing: group/filter/search choices persist per client in
localStorage, while pin lives in bb. Done is a fact about a thread (archived),
not an opinion, so it should follow the same pattern as pin — bb's state, not
ours. Two candidate shapes:

1. **Derive Done from bb's archive state.** Archived threads exist in the live
   thread view; we exclude them today. Rendering an Archived column (collapsed
   by default, Deck-style) means zero plugin storage: archive via the existing
   sidebar actions, unarchive via `sdk.threads.unarchive` (already used for the
   thread pane). Cheapest, honest, and nothing to migrate.
2. **A plugin-level done flag in the plugin database** for threads you want to
   mark finished *without* archiving — useful when you keep a thread around for
   follow-up. Costs storage, a server route, and a second source of truth for
   "what is done." Only worth it if the archive column proves insufficient.

Lean toward shape 1 first: it adds a real lane with no new state at all, and
the plugin stays a view over bb rather than a database beside it. If a
separate "done but not archived" distinction shows up in real use, that's the
evidence shape 2 needs.

Persisting the *choice to show Done* (the column toggle) is the same problem
as group/filter persistence — separate question, still fine in localStorage,
or move all view preferences server-side together later.

## Is a CLI command useful here?

Probably not. The pattern elsewhere (Deck, Taskboard, Autobahn) exposes a CLI
because the plugin has state to read or mutate that agents/automation need:
Taskboard's `bb taskboard move` operates on external trackers; Deck's tools
write notes and tags agents consume.

Thread Board is a **view over bb's threads**, and bb's own CLI already covers
everything meaningful: `bb thread list/show/pin/archive/tell`. A
`bb thread-board` command would be a thin re-spelling of `bb thread`, with one
extra hop and nothing of its own. The one honest exception: if server-side
view preferences or a plugin-level done flag land (shape 2), a small
`bb thread-board config` command for those settings earns its place the way
`bb thread-list` and `bb branch-janitor` do — managing plugin-owned state.

Verdict: no CLI for read actions; revisit only alongside plugin-owned state.

## Tracker integration without committing to a tracker

The biggest real gap, and the user does not commit to a single tracker
(GitHub today, maybe Linear, Jira, or plain files elsewhere). Options, loose
to strict:

- **Adapter layer + per-project source selection** (Taskboard's model, applied
  generically). Each BB project picks a source — GitHub, Linear, Jira,
  Backlog.md, or none. The board gains a "Work" column fed by the chosen
  adapter; threads on cards stay native. Honest but a large build: every
  adapter is its own auth surface, cache, and reconciliation story.
- **Mirror, don't integrate.** Keep the board thread-first; show tracker
  signals as card metadata. Parse ticket IDs from titles/branches (Deck's
  `eng-482`, `#1284` search tokens are the model), link out, and — with the
  official GitHub plugin's RPC — show live issue/PR status on cards whose
  title/branch carries a reference. No tracker commitment; GitHub support is
  nearly free via the existing plugin; Linear/Jira need credentials the user
  hasn't offered.
- **The thread-tags handshake.** Tags already exist as a bb-side convention
  via the thread-tags plugin. A card could show `tracker:eng-482` tags as
  links/status lines. Weakest version; no live status without per-tracker
  fetchers anyway.

Lean toward **mirror, don't integrate** as step one: ticket-ID detection on
cards (pure, testable, zero credentials), link-out on click, then GitHub
issue/PR status through the official GitHub plugin's RPC for projects that
have it mapped — which is a real feature without owning a tracker
abstraction. A full adapter layer is a product of its own; if it ever lands,
per-project source selection is the proven shape (Taskboard), but start by
watching whether the mirroring satisfies the actual itch.

## Open questions

- Does bb's sidebar thread view expose archived threads (for the Done
  column), or does reading them require a different SDK surface?
- Would GitHub status-on-card require polling or can the GitHub plugin RPC be
  called cheaply per visible card?
- Do view preferences move server-side before or after the Done column?