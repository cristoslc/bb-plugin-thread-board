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

Update: the operator does want the separation — Done is a distinct lane from
Archived, so **shape 2 is the chosen direction** — but see the Done-as-tag
section below, which may satisfy it without a plugin database at all.

### View preferences are device-local by design (operator correction)

The operator pushed back on moving group/filter/search server-side: these
preferences should stay per client, because different machines and browser
tabs do different things, and the board should reflect where you are, not a
single global view. So localStorage here is not a symptom — it is the correct
scope. Done was never in localStorage (nothing is stored about it today);
the earlier draft conflated the two. Revised position: pane width *and* view
preferences are deliberately device-local; the only state that must move
server-side is Done itself.

### README correction

"Reads bb's live thread view … and makes no server-side writes" is neither
true (the board already writes pin state and Unread drops through bb's native
sidebar actions, and will write Done state) nor useful. Reword to name what
the board owns: it makes no writes *to thread content* — reads everything
else live, writes pins/marks/Done through bb's own stores, and keeps nothing
of its own except the small state it declares. Done becomes plugin-owned
state: a plugin database table keyed by thread ID, marked from a card action,
clearable, and surviving while the thread itself stays active in bb. That
makes this plugin the source of truth for "done," while bb stays the source
of truth for the thread itself.

The distinction earns its cost because the two states answer different
questions: Done means "the work landed, but the thread may still be useful"
(reference material, follow-up pending); Archived means "the thread itself is
retired." A thread can be Done-not-archived, or archived without ever being
marked Done.

### The aging sweep: Done → Archived

Marking Done is the beginning of a thread's exit, not a terminal state, so
Done needs an exit to Archived. Two candidate shapes:

1. **Automatic aging.** Threads marked Done for ≥ N days (a week?) archive
   themselves. Reads bb's thread list server-side on a schedule or on board
   load, archives anything past the threshold. Costs a background sweep, a
   setting, and the surprise of an archive the operator didn't perform today.
2. **A sweep button on the Done column.** The column header shows a count of
   Done threads older than the threshold ("Sweep 6 done threads → archive");
   one click archives them all. No background process, no surprise — the
   operator pulls the lever. Undo is bb's unarchive, already wired.

Lean toward **shape 2, with a threshold setting** (`doneArchiveDays`, default
7): the button only ever proposes what aging would have done automatically,
so graduating to a fully automatic sweep later is a settings change plus a
scheduler, not a redesign. The count in the button label makes the cost of
ignoring it visible, which an invisible automatic sweep never does. A per-card
override ("keep this one forever" / pin-within-Done) protects threads you want
to hold past the threshold; without it, a sweep that archives your reference
thread once is the last time anyone uses the feature.

### Sweep refinement (operator direction)

The sweep deserves its own musing, but the operator confirmed the direction
and added three points, then refined the interaction model:

- **Two-click arm-then-confirm, modeled on delete patterns.** First click
  arms the sweep: the button activates (e.g. gains "?"), eligible cards are
  highlighted visually, and they gather at the top of their column so the
  blast radius reads at a glance. Second click performs it. The button label
  extends while armed to say where the swept threads go ("Sweep 6 → Archive").
  Disarming is the same click path (click again or click away); nothing moves
  until the second click. This replaces the earlier one-click button; the
  armed state *is* the graphical pre-sweep indication, concentrated.
- **Graphical pre-sweep indication.** Cards that would be swept (Done ≥
  threshold, or long-idle) must be identifiable before the second click —
  highlight plus gather-to-top during the armed state satisfies this; an
  always-on marker (tick fringe, "sweeps in N days" chip) is a possible
  refinement so eligibility is visible even when not armed.
- **Sweep also applies to the "Awhile ago" column.** The idle-aging bucket
  (newest-first idle buckets are part of the board's Attention grouping) is
  the same "old and quiet" signal from the other side: a thread idle for
  ages *and* not Done should be sweep-eligible too, or the sweep only cleans
  up the threads you bothered to mark. That widens the sweep from "archive
  old Done" to "archive old Done + long-idle," which makes the override
  valve more important, since long-idle includes threads someone simply
  hasn't closed out.
- **Override safety valve confirmed.** Per-card keep-past-threshold stands,
  and given the widened sweep it likely needs to apply to idle-aging cards
  too, not just Done ones.

Sweep candidates worth deciding in the dedicated musing: does arming also
apply to the Awhile-ago column's sweep separately (two buttons, or one sweep
across columns)? Does the gather-at-top survive a live thread update arriving
mid-arm? And where the count/aging comes from when Done is a tag: the stamp
date on the card, same as the board already renders.

Open question: does the sidebar thread view expose `archivedAt` (or last
activity) for Done cards to age against — or does the sweep age from the
*done-marked* timestamp instead? Marking time is the simpler and more
predictable basis: "Done a week ago" is about your attention, not the
thread's last flicker. Lean: age from the done-marked timestamp.

## Is Done a thread-tag in practice?

Maybe the best version yet. The thread-tags plugin already stores freeform
tags server-side, keyed by thread, shared across clients, with a CLI
(`bb thread-tags add/threads`) agents can write too. Storing Done as a tag
(even a reserved single-value one, N = 1) means:

- **All clients render it with zero new server surface.** No plugin database,
  no sync story — the tags store *is* the server-side state.
- **The done-marked timestamp comes free-ish**: the tags registry records
  first-seen dates per tag, and a tag set can carry a stamped form
  (`done:2026-09-25`) instead of a bare `done` — the tag itself is the record.
- **Agents can mark threads done** via the existing CLI, closing half the
  agent-tools gap from the comparison without shipping our own tool.
- **`bb thread-tags threads done` is the sweep's query**, before any CLI of
  our own.

What tags do *not* give us: the override flag (keep past threshold) would be
a second reserved tag (`done:keep`); the sweep ordering; a migration-proof
schema. And the card action now depends on the thread-tags plugin being
installed, or we write the tag through its RPC/CLI rather than owning the
storage. That dependency is real but mild: tags are a bb-side convention
other surfaces already read, and a Done marker that the tags panel, the
registry, and agents can all see is arguably *more* honest than a private
table.

Open design points if Done-as-tag wins:

- Reserved-tag naming: `done` alone, or `done:<ISO date>` stamped at mark
  time? Stamped is self-aging; bare `done` needs the registry's first-seen
  date, which is weaker provenance.
- Do we reserve the tag namespace (`done:*`, `done:keep`) and document it, or
  treat Done as an ordinary tag that merely renders specially on the board?
- Does the board *write* through `bb thread-tags` (CLI from host) or the
  thread-tags plugin's RPC? CLI is simplest; RPC avoids shelling out.

Lean: Done-as-tag with a stamped form (`done:YYYY-MM-DD`), reserved `done:*`
namespace, board writes via RPC if available and CLI as fallback. The plugin
database then holds nothing for Done — it holds, at most, sweep/override
bookkeeping if tags prove insufficient.

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
Update: plugin-owned state is now the direction (Done table + sweep), so a
small `bb thread-board` surface (`done list`, `sweep`, `config`) comes back
into scope with it — same rule as `bb thread-list`: the CLI exists to manage
plugin-owned state, not to re-spell bb thread commands.

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