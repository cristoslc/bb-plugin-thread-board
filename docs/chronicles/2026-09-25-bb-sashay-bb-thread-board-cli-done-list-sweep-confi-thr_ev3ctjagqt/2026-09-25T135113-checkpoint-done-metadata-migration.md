---
type: checkpoint
timestamp: 2026-09-25T135113
responding-to: intent 2026-09-25T134001 (done metadata migration)
---

## Checkpoint: Done storage migrated to per-thread plugin metadata

**Responding to:** the work-unit-1 intent — migrate Done storage before
CLI work, keeping the RPC contract intact.

What shipped in commit `a0b0469`:

- `server.ts` — `done_list`/`done_set` now read/write the board's
  `"done"` key through `threads.getPluginMetadata`/`updatePluginMetadata`.
  Legacy KV row `done-thread-ids` is migrated at load: ids become
  unstamped done records (never sweep-eligible) and the row is deleted.
  `done-changed` realtime broadcast preserved on RPC writes. Settings
  descriptors `doneArchiveDays` (7) / `idleArchiveDays` (30) declared.
- `lib/done-metadata.ts` — pure helpers: record parse (rejects non-ISO
  `doneAt`, non-boolean `keep`), stamp/parse, threshold boundary
  (age ≥ threshold counts), sweep eligibility predicate with injected
  `now`.
- `tests/done-metadata.test.ts` — 28 tests: helpers (happy/sad/edge),
  RPC round-trip over metadata, re-mark refreshes doneAt and preserves
  keep, KV migration via `lifecycle.reload`, migrated ids never
  sweep-eligible, broadcast assertion.

Tests: `npm test` 51 passed (51), `npx tsc --noEmit` clean. One root
cause found during the unit: `done_list` originally scanned only
`threads.list`, missing migrated ids — fixed to union the live list with
the plugin's own written-id registry (the SDK has no metadata scan).

**Commits in this unit:** a0b0469