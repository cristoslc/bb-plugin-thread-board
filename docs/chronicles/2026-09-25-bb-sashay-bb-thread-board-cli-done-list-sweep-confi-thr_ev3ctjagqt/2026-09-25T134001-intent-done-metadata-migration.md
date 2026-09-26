---
type: intent
timestamp: 2026-09-25T134001
responding-to: intent post 2026-09-25T132748 (implement bb thread-board CLI)
---

## Work unit 1: Done storage migration to per-thread plugin metadata

**Responding to:** the first intent's next-work-unit line — migrate Done
storage before any CLI code lands, so the CLI and the board RPC read one
store.

Plan: replace the KV row `done-thread-ids` in server.ts with per-thread
bb-native plugin metadata — key `"done"` → `{ doneAt: ISO-8601, keep?:
boolean }` — read/written via `bb.sdk.threads.getPluginMetadata` /
`updatePluginMetadata` (SDK defaults `pluginId` to the calling plugin).
`done_list` / `done_set` keep their wire shape so app.tsx is unchanged.
Migration: the old KV row's ids count as done with `doneAt` unknown (never
sweep-eligible; no fabricated timestamps); the row is deleted after
migrating. `done-changed` realtime broadcast continues on writes.

New files: `lib/done-metadata.ts` (record schema/parsers, stamp/parse —
pure, framework-free) and `tests/done-metadata.test.ts` (vitest with
`createFakePluginHost`), including failure-expecting tests and the KV
migration round-trip.

**Commits in this unit:** none yet