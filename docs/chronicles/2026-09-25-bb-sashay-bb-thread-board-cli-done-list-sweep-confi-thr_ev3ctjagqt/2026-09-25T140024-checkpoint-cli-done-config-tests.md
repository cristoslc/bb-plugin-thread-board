---
type: checkpoint
timestamp: 2026-09-25T140024
responding-to: intent 2026-09-25T135625 (CLI done/config tests)
---

## Checkpoint: done list/mark/clear + config show/set CLI tested

**Responding to:** the unit-2 intent — exercise the registered CLI over
the metadata store and settings.

What shipped in commit `c2cea54`:

- `tests/cli.test.ts` (24 tests) — `done list` (--json row shape, empty
  state, keep + "not in the live thread list" flags, index-only
  deleted-thread rows, migrated "unknown date" rows), `done mark`
  (stamp, idempotent refresh preserving keep, multi-id, --json,
  missing-required failure, done-changed broadcast), `done clear`
  (idempotent on non-done, --json, missing-required), `config show`
  (defaults, overridden flag), `config set` (happy path echoes new
  effective value, unknown key → error naming valid keys, 0/negative/
  non-integer/abc rejected with stored value untouched), declaration
  behavior (`--help` exit 0, unknown-option suggestion, unknown
  command, CLI registered as `thread-board`).
- `server.ts` — added a `done-index` KV row (id list, distinct from the
  legacy `done-thread-ids` row): the SDK has no metadata scan, so the
  index is how `done list` reports marks on threads that have since
  been deleted. `done_list` RPC now shares `listDoneThreadIds` with the
  CLI (live + archived lists, plus index-only ids). Every board write
  maintains the index.

Design note (deviation from the pure-metadata-only read): the plan's
"threads missing from the live list still appear" requirement needs an
id index because deleted threads' metadata is unreachable through the
SDK's per-thread accessors. The index is board-owned KV, repaired
against live+archived lists at read time; a stale entry only suppresses
itself (metadata is still checked before a row prints).

Tests: `npm test` 75 passed (75), `npx tsc --noEmit` clean.

**Commits in this unit:** c2cea54