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

Earlier lean (superseded below): Done-as-tag with a stamped form, reserved
namespace, writes via RPC with CLI fallback.

## The dependency question, settled: thread metadata is bb-native

Checked the SDK (`@get-bb/plugin-sdk` bundled types, 2026-09-25): bb exposes
`threads.getPluginMetadata` / `threads.updatePluginMetadata` as core surfaces,
namespaced by `pluginId`. The thread-tags plugin does not own that store — it
stores tags as its own namespace's `"tags"` key inside it
(`TAGS_METADATA_KEY`), plus a `bb.storage.kv` registry for autocomplete.

Consequences:

- **No dependency on the tags plugin.** The board writes Done into its own
  thread-metadata namespace (`pluginId: "thread-board"`, key `"done"` —
  e.g. `{ doneAt: "2026-09-25", keep: true }`). Server-side, all clients
  render it, survives alongside tags, zero cross-plugin coupling.
- **Do not absorb tags.** Tags and Done would be two encodings of one store;
  absorbing duplicates the tags plugin's registry/CLI/skill for no gain and
  creates two sources of truth for the same data. The board reads tags for
  display if useful later; it never writes them.
- **The one thing tags gave that metadata does not:** agents marking threads
  done for free via `bb thread-tags`. With plugin-metadata Done, agents need
  a board-provided tool or CLI to mark done — that is the CLI musing's
  `done list`/`mark` surface, now with a concrete reason to exist.
- Done-as-tag remains possible (a board-specific stamp tag written via the
  tags plugin's RPC), but it buys visibility in the tags panel at the price
  of coupling to another plugin's namespace. Lean flips to **plugin metadata:
  own namespace, stamped `doneAt`, optional `keep` flag** — same server-side
  guarantees, no dependency.

## SETTLED (2026-09-25, operator call): Done lives in plugin metadata, pluginId `thread-board`

The lean above is now the decision. Done is stored as bb-native thread plugin
metadata scoped to the board plugin:

- **Namespace:** `pluginId: "thread-board"` (SDK defaults `pluginId` to the
  calling plugin on both frontend `sdk.threads` and backend `bb.sdk`; plugin
  ids are lowercase letters/digits/dashes — ours qualifies).
- **Key and shape:** `"done"` → `{ doneAt: <ISO-8601 string>, keep?: boolean }`.
  Absent key = not done. `doneAt` is the sweep's aging basis; `keep` is the
  per-card sweep override.
- **Why:** server-side so every client renders the same Done set; rides with
  the thread across moves; zero dependency on the tags plugin; not absorbed
  into tags (two encodings of one store, two sources of truth).
- **Known limitation, accepted:** plugin metadata does NOT appear in the
  live sidebar stream (`PluginSidebarThread` carries no `pluginMetadata`, and
  thread realtime changes have no metadata event). The board keeps its
  custom `done-changed` realtime publish plus RPC read path — it refetches
  on signal rather than reading metadata from the stream. The 256 KiB
  per-namespace cap is a non-issue: one tiny `done` record per thread.
- **Coordination:** the sweep sashay built its core over a `DoneAgeSource`
  interface (lib/sweep.ts) with the KV stopgap; the CLI sashay's plan already
  specifies the metadata-backed RPC migration. This sashay lands the record
  shape both siblings await.


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