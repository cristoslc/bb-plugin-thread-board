---
type: checkpoint
timestamp: 2026-09-25T135540
responding-to: Unit B intent (this PR)
---

## Checkpoint: Unit B green — metadata-backed RPC

**Responding to:** [Unit B intent](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

TDD round complete: red confirmed (8 failing tests against the KV-backed
server), then
[server.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/server.ts)
re-pointed at plugin metadata to green. `done_set(true)` stamps via
`updatePluginMetadata({ threadId, set: { done: <record> } })` preserving
`keep`; `done_set(false)` issues `remove: ["done"]`; both publish
`done-changed` with `{ threadId, done }` (payload changed from the KV
`{ count }` — consumer refetches without reading the payload, per plan).
`done_list` enumerates `threads.list({})` + per-thread `getPluginMetadata`,
drops archived ids (absent from list), sorts, and fails loud on malformed
records via the Unit A parser.

11 new tests in
[tests/done-rpc.test.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/tests/done-rpc.test.ts)
over `createFakePluginHost` with an in-memory metadata namespace stubbing
the three `threads.*` methods (merge/remove semantics the SDK documents).
Suite: 49 passed (3 files), `npx tsc --noEmit` clean. app.tsx untouched.
Migration shim is Unit C — the legacy KV path is now dead code on this
branch (nothing reads it), and Unit C imports it one last time.

**Commits in this unit:** (Unit B implementation commit, next entry's
footer)