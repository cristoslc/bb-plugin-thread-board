---
type: intent
timestamp: 2026-09-25T133600
responding-to: nothing (intent post for the server work unit)
---

## Intent: server — done stamps, keep flag, sweep settings RPC

**Responding to:** nothing (intent post for next work unit).

Next work unit is the server side, per the plan: extend the Done KV record
from a bare id list to per-thread records `{ doneAt?: number, keep?:
boolean }` (stamping first-seen on mark-done; keeping existing ids with no
stamp — they stay sweep-ineligible); new RPC methods `sweep_config_get`
(returns `doneArchiveDays`/`idleArchiveDays` from plugin settings with
defaults) and `sweep_keep_set` (set/clear the keep flag); `done_set(done:
true)` stamps `Date.now()` for entries without one. Contract tests assert
the zod schemas and the keep-flag round-trip.

Success: server.ts typechecks, contract schemas tested, existing
`done_list`/`done_set` shape preserved for the UI's `doneIds` set.

**Commits in this unit:** none yet