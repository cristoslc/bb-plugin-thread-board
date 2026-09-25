# Musing: The Done state

*2026-09-25 · split from the combined done/CLI/trackers musing · origin: a feature comparison against Deck, Autobahn, Agent Board, Taskboard, and Backlog.MD*

Shared context from that comparison: the README's "makes no server-side
writes" line was not code truth. `app.tsx` already calls
`experimental_useSidebarThreadActions().setPinned()`, which writes bb's own
server-side pin state, and the Attention grouping already supports dropping a
card onto the Unread column. So the board writes through **bb's native thread
actions**; what it never writes is its *own* plugin state.

## The decision: Done is distinct from Archived

The operator wants a separation. Done becomes plugin-owned state, distinct
from bb's archive: marked from a card action, clearable, surviving while the
thread itself stays active in bb. The plugin is the source of truth for
"done"; bb stays the source of truth for the thread itself.

The distinction earns its cost because the two states answer different
questions: Done means "the work landed, but the thread may still be useful"
(reference material, follow-up pending); Archived means "the thread itself is
retired." A thread can be Done-not-archived, or archived without ever being
marked Done.

Rejected along the way: deriving Done from bb's archive state (one collapsed
Archived column, zero plugin storage). Cheapest, but it erases the separation
the operator wants — archived-but-not-done and done-but-useful are exactly
the cases this column exists to separate.

## Is Done a thread-tag in practice?

Maybe the best version. The thread-tags plugin already stores freeform tags
server-side, keyed by thread, shared across clients, with a CLI
(`bb thread-tags add/threads`) agents can write too. Storing Done as a tag
(even a reserved single-value one, N = 1) means:

- **All clients render it with zero new server surface.** No plugin database,
  no sync story — the tags store *is* the server-side state.
- **The done-marked timestamp comes free-ish**: a stamped form
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

Open design points:

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

## Scope note: what stays device-local

View preferences (group/filter/search) and pane width stay in localStorage —
deliberately. Different machines and browser tabs do different things, and
the board should reflect where you are, not one global view. Done was never
in localStorage; the only state that must move server-side is Done itself.

## README correction

"Reads bb's live thread view … and makes no server-side writes" is neither
true (the board already writes pin state and Unread drops) nor useful. Reword
to name what the board owns: it makes no writes *to thread content* — reads
everything else live, writes pins/marks/Done through bb's own stores, and
keeps nothing of its own except the small state it declares.