# Plan: `bb thread-board` CLI — done list/mark/clear, sweep, config

*Sashay plan · 2026-09-25 · thread `thr_ev3ctjagqt` · branch
`bb/sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt`*

Charter: `docs/musings/2026-09-25-cli-command.md`. Context siblings:
`docs/musings/2026-09-25-done-state.md`,
`docs/musings/2026-09-25-sweep.md`. Decisions in the musings are settled;
this plan sizes the CLI surface by them and does not relitigate.

## Settled inputs (from the musings, verified against the SDK)

1. **Done storage = bb-native thread plugin metadata.** The Done-state
   musing (last section, "The dependency question, settled") flips the
   earlier Done-as-tag lean: the board owns Done in its own namespace —
   `threads.getPluginMetadata` / `threads.updatePluginMetadata`,
   `pluginId: "thread-board"` (the SDK defaults `pluginId` to the calling
   plugin's id; server-side `bb.sdk` in `server.ts` has the same
   narrowing). Record shape: key `"done"` → `{ doneAt: ISO-8601 string,
   keep?: boolean }`. Consequence per the CLI musing: `done list` and
   `done mark`/`done clear` **earn their place** — no `bb thread-tags`
   duplicate exists. The `done list` subcommand stays in scope.

2. **Standing rule: the CLI manages plugin-owned state only.** No
   re-spelling `bb thread list/show/pin/archive/tell`. Everything this
   CLI reads or writes is either the board's own metadata namespace or a
   plugin setting.

3. **Sweep needs its own confirmation surface.** The board's
   arm-then-confirm friction does not exist in a one-shot CLI invocation.
   Per the charter: require an explicit confirm flag, list what will be
   archived before confirming.

4. **Config = thresholds/defaults**, editable both from the plugin
   settings page (`bb plugin config thread-board set …`) and read through
   the CLI.

## Open question answered here: sweep is one-shot, with a printed freeze window

The CLI musing asks: does a CLI sweep target the board's explicit-list
(freeze a list, confirm, fire) semantics, or is it inherently one-shot?

**Answer: one-shot, by construction.** The board freezes its card list at
arm time to close the mid-arm race between arm and confirm clicks. A CLI
invocation has no arm phase, so there is no race window to freeze across —
the gap between eligibility and archive is a single RPC, not an
indefinitely armed UI state. What the CLI owes the operator instead is
**visibility and friction at the moment of firing**:

- `bb thread-board sweep` (no flags) prints what is currently eligible
  (id, title, why it qualifies) and exits 1 without archiving anything —
  a dry-run that is also the arm step's analog.
- `bb thread-board sweep --confirm` re-resolves eligibility and archives
  exactly the threads that qualify at that instant. If eligibility
  changed between a dry-run and a confirm, that is visible to the
  operator: the confirm prints the same eligibility list with its result.
- `--ids thr_x,thr_y` narrows the sweep to an explicit set (the board's
  frozen-list semantics, importable: the operator may dry-run on the
  board, see the highlighted blast radius, then pass exactly those ids).
  When `--ids` is given with `--confirm`, **only** those ids are archived
  even if more threads crossed the threshold in between — the frozen-list
  guarantee carries over to the CLI when the operator asks for it.

So: default one-shot, explicit-list when the operator supplies one. The
freeze exists in both cases; what differs is who freezes (the operator,
by passing ids) versus the arm click (the board).

## CLI surface

Registered via `bb.cli.register(defineCli({ name: "thread-board", … }))`
in `server.ts` — one top-level command per plugin, so this is the plugin's
single CLI entry point. `defineCli` gives every command `--help`, unknown-
option suggestions, missing-required aggregation, and the `--json` error
envelope; no hand-rolled argv parsing.

```
bb thread-board done list [--json]
bb thread-board done mark <thread-id>... [--json]
bb thread-board done clear <thread-id>... [--json]
bb thread-board sweep [--ids <id>...] [--json]            # dry-run: prints eligible set, exit 1
bb thread-board sweep --confirm [--ids <id>...] [--json]  # archives
bb thread-board config show [--json]
bb thread-board config set <key> <value> [--json]
```

### `done` — the board's own Done namespace

Storage: per-thread plugin metadata, key `"done"`:
`{ doneAt: string (ISO-8601), keep?: boolean }` — the same store the
merged board (PR #4) and sweep (PR #1) surfaces read; the CLI is a third
surface over it, never a second encoding. The board reads it with
`threads.getPluginMetadata({ threadId })` (absent = not done) and writes
it with `threads.updatePluginMetadata({ threadId, set: { done } })` /
`{ remove: ["done"] }`. Keep overrides live in two places and the CLI
merges them: inside the done record, and in the sweep sibling's KV keep
store (`sweep-keep-flags`) for threads never marked Done.

- `done list` — list every thread carrying the board's `done` metadata:
  id, `doneAt`, `keep`, title (from `threads.list`; threads missing from
  the live list — deleted or archived — still appear, marked as such).
  `--json` emits the structured array. This is the sweep's input query
  and the agents' way to see Done state.
- `done mark <thread-id>...` — stamp `{ doneAt: <now ISO-8601> }` into
  each named thread's board-metadata namespace. Idempotent: re-marking
  refreshes `doneAt` (matches the board's card action semantics and the
  sweep's "aging basis = doneAt stamp" decision). Agents get free Done
  marking here — closing the gap the Done-state musing names as the one
  thing tags would have provided.
- `done clear <thread-id>...` — remove the `done` key (`remove: ["done"]`).

These three subcommands do not exist in any other surface; they are the
rationale for the CLI's existence.

### `sweep` — archive old Done + long-idle, with explicit confirmation

Eligibility, mirroring the sweep musing's board semantics (the board's
UI sweep is a sibling sashay — `thr_x7zz4eabg2`; both read the same
settings keys and the same metadata shape so the two surfaces agree):

- Done threads: `doneAt` older than `doneArchiveDays` (default 7) and
  `keep` not set. `keep` is the override safety valve; the CLI honors it.
- Long-idle threads: not Done, not archived, `updatedAt` older than the
  idle threshold. The sweep musing leaves the idle-bucket semantics open
  ("which idle bucket counts as long-idle, and whether it shares
  `doneArchiveDays`"); this plan settles it for the CLI: **`idleArchiveDays`,
  default 30, its own setting** — Done aging is about the operator's
  attention (they marked it), idle aging is about the thread's silence;
  one number answering both conflates two questions. The board's sweep
  arm can read the same setting when that sashay lands. Key name chosen
  to match the sibling sweep sashay's plan (`thr_x7zz4eabg2`), which
  already commits to `idleArchiveDays`; the two surfaces must read the
  same settings keys.

Behavior:

- Without `--confirm`: print the eligible set (id, title, reason) and the
  counts; **exit 1** (a scripted invocation reading only the exit code
  must not mistake "here is what I would archive" for success). Nothing
  is archived.
- With `--confirm`: resolve eligibility at that instant and archive via
  `threads.archive({ threadId })` each. Print per-thread results. Never
  touches threads not in the resolved set.
- With `--ids`: intersect with eligibility for the dry-run print; when
  combined with `--confirm`, archive exactly those ids (that are still
  not archived), regardless of whether other threads also qualify —
  frozen-list semantics, operator-supplied.
- `keep` threads never appear. Already-archived threads never appear.

The sweep is the only destructive subcommand; its friction lives in the
required two-step (dry-run print, then `--confirm`) and the exit-1
dry-run.

### `config` — thresholds and defaults

Settings descriptors declared via `bb.settings.define` (rendered in
Settings → Installed plugins; editable via
`bb plugin config thread-board set <key> <value>`; the CLI reads and
writes the same store):

- `doneArchiveDays` — number, default 7 (sweep musing: "default 7").
- `idleArchiveDays` — number, default 30 (aligned with the sibling sweep
  sashay's plan; see the eligibility section above).

- `config show` — print current effective values and their defaults,
  including which are overridden. `--json` for machines.
- `config set <key> <value>` — thin validation wrapper: accepts the two
  known keys, validates bounds (positive integers), writes via
  `settings.experimental_set`, echoes the new effective value. Unknown
  keys are a `PluginCliError` naming the valid keys. This subcommand
  exists so agents get one discoverable surface (`bb thread-board
  config set idleArchiveDays 14`) without learning `bb plugin config`
  syntax.

## Implementation shape

- `server.ts` — add `bb.settings.define` descriptors, the
  `defineCli` registration, and the sweep-eligibility/archive logic.
  Replace the existing KV-based `done_list`/`done_set` RPC with
  metadata-backed RPC so the board UI and the CLI share one store (the
  frontend's `rpc.call("done_list")` keeps working; the storage moves
  from `bb.storage.kv` "done-thread-ids" to per-thread plugin metadata).
  Broadcast the existing `done-changed` realtime event after CLI and RPC
  writes so open boards refresh.
- `lib/done-metadata.ts` (new) — pure helpers: the record schema, stamp/
  parse, eligibility predicate given settings and "now" (testable
  without a host).
- `tests/cli.test.ts` (new) — `createFakePluginHost` harness: RPC
  round-trips, CLI argv paths (`done list/mark/clear`, `sweep` dry-run
  and confirm, `config show/set`), eligibility edge cases (threshold
  boundaries, `keep`, already-archived, unknown ids), `--json` output
  shape, and the exit-1 dry-run rule. Stub
  `threads.getPluginMetadata`/`updatePluginMetadata`/`list`/`archive`
  through the harness's SDK overrides and inspect
  `harness.inspection.sdk.calls` for archive calls.
- `app.tsx` — unchanged read path (`done_list` RPC still returns the
  done-id set); the RPC handlers re-point at metadata storage.

## Pre-test inventory (delta)

| Path | Blast radius | Happy | Sad | Edge | Corner |
|------|--------------|-------|-----|------|--------|
| `bb thread-board done list` | low | auto | auto (unresolvable thread ids in metadata) | auto (empty list, archived/deleted threads) | manual |
| `bb thread-board done mark` | medium (writes state) | auto | auto (unknown thread id rejected) | auto (re-mark refreshes doneAt; multi-id partial failure) | manual |
| `bb thread-board done clear` | medium | auto | auto (unknown id) | auto (clear when not done — idempotent) | manual |
| `bb thread-board sweep` (dry-run) | low | auto | auto (no eligible threads) | auto (boundary: exactly at threshold) | manual |
| `bb thread-board sweep --confirm` | **high** (archives threads) | auto | auto (nothing eligible → no archive calls) | auto (`--ids` narrows; `keep` honored; already-archived skipped) | manual |
| `bb thread-board config show/set` | low | auto | auto (unknown key, bad value) | auto (bounds: 0, negative, non-integer) | manual |
| RPC `done_list`/`done_set` over metadata | medium (board UI path) | auto | auto (metadata absent) | auto (round-trip with CLI writes) | manual |

Integrity is the only risk category that fires (archive is destructive,
Done state must round-trip between board and CLI) — so beyond-happy-path
coverage is required and declared above. No live-host manual steps are
planned; the corner cells are covered by the live `bb` smoke check below
if the operator runs one.

## Test command

`npm test` (vitest) and `npx tsc --noEmit` — both must pass. The
project now has a root `AGENTS.md` (committed by the sibling sweep
sashay's plan) declaring `## Test command: npm test` and pointing at
`docs/test-coverage-matrix.md`. This sashay's delta rows (below) roll up
into that master matrix during implementation.

## Out of scope (same rule as the musing)

- No re-spelling of `bb thread` reads. The CLI never prints a thread
  list except as the sweep/done-list output of its own state queries.
- No automatic aging/scheduler (rejected in the sweep musing).
- The board's arm-then-confirm UI is the sibling sashay's scope; this
  plan only keeps storage and settings compatible with it.