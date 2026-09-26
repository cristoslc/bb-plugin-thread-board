---
type: checkpoint
timestamp: 2026-09-25T133800
responding-to: nothing (checkpoint after the server work unit)
---

## Checkpoint: server work unit green — 50 tests, typecheck clean

**Responding to:** nothing (results entry for the server work unit).

One red on the way in was the test file importing the wrong symbols (the
default plugin function instead of the named `rpcContract`); fixed the
import, no product change.

Server changes (`server.ts`):

- Done KV record shape extended from `string[]` to per-thread
  `{ doneAt?: number, keep?: boolean }`. `done_list` output shape
  (string ids) is preserved — the UI's `doneIds` set needs no change.
- Legacy bare-id arrays are migrated on first read: each id becomes an
  empty record with no stamp, so pre-sweep done threads remain visible and
  Done but are never sweep-eligible until re-marked (fail-safe: no guessed
  ages).
- `done_set(done: true)` stamps `doneAt: Date.now()` on first mark; an
  existing stamp survives unmark/re-mark? No — unmark deletes the record;
  re-marking starts a fresh stamp. That is the attention-based semantics
  the musing wants ("Done a week ago" = when you marked it).
- `sweep_config_get` reads plugin settings (`doneArchiveDays` default 7,
  `idleArchiveDays` default 30; zod-gated integers ≥ 1).
- `sweep_keep_set` sets/clears `keep` on an existing Done record; for an
  untracked thread it throws instead of silently creating a record — a
  bare keep entry would masquerade as Done on the board.

Results: 50/50 tests pass (23 grouping + 23 sweep + 4 RPC contract),
`npx tsc --noEmit` clean.

**Commits in this unit:** (posts before the code commit completing the unit)