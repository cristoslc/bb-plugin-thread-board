---
type: checkpoint
timestamp: 2026-09-25T140243
responding-to: intent 2026-09-25T132748 (implement bb thread-board CLI)
---

## Closing status update: `bb thread-board` CLI implemented and green

**Responding to:** the opening intent — the CLI command surface for the
Thread Board plugin, per the plan.

What shipped, in order:

1. `a0b0469` — Done storage migrated from the KV row
   `done-thread-ids` to per-thread bb-native plugin metadata (key
   `"done"` → `{ doneAt?: ISO-8601, keep?: boolean }`) via
   `threads.getPluginMetadata` / `updatePluginMetadata`. Legacy KV ids
   migrate to unstamped records (never sweep-eligible, no fabricated
   timestamps) and the row is removed. RPC contract unchanged, so
   `app.tsx` needed no changes. Pure helpers live in
   `lib/done-metadata.ts` (now injected, no `Date.now()`).
2. `c2cea54` — CLI tests for done list/mark/clear + config show/set;
   plus a board-owned `done-index` KV row so Done marks on threads that
   have since been deleted remain listable (the SDK has no metadata
   scan).
3. `38afbf3` — sweep CLI tests: dry-run prints + exits 1 with zero
   archive calls; `--confirm` archives exactly the resolved set;
   `--ids --confirm` frozen-list semantics; keep / already-archived /
   unstamped-migrated never archived; thresholds respected through
   `config set`.
4. `daf7cdb` — README write-claims corrected, CLI section added;
   coverage-matrix delta rows rolled up.

Registered surface: one `defineCli` command `thread-board` with
subcommands `done list|mark|clear`, `sweep`, `config show|set`; settings
`doneArchiveDays` (default 7) and `idleArchiveDays` (default 30) declared
via `bb.settings.define`, keys matching the sibling sweep sashay's plan.

Verification: `npm test` 89 passed (89) across 4 files
(`tests/done-metadata.test.ts` 28, `tests/cli.test.ts` 24,
`tests/sweep-cli.test.ts` 14, `tests/grouping.test.ts` 23);
`npx tsc --noEmit` clean; `bb plugin build` produced dist artifacts.

Deferred work (not this sashay's scope): the board's arm-then-confirm UI
sweep (sibling sashay `thr_x7zz4eabg2`); live-host operator smoke of the
CLI (matrix corner cells marked manual); board-UI rendering of doneAt/keep.

**Commits in this unit:** a0b0469, c2cea54, 38afbf3, daf7cdb, bc3380e