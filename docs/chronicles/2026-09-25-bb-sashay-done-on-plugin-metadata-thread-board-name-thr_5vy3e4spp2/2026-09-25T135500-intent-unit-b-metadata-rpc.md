---
type: intent
timestamp: 2026-09-25T135500
responding-to: Unit A checkpoint (this PR)
---

## Intent: Unit B — metadata-backed done RPC in server.ts

**Responding to:** [Unit A checkpoint](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

Re-pointing the `done_list`/`done_set` RPC storage layer at per-thread
plugin metadata via `threads.getPluginMetadata` /
`threads.updatePluginMetadata` (`set: { done }` to stamp,
`remove: ["done"]` to clear). `done-changed` publishes `{ threadId, done }`
after every successful write. `done_list` enumerates via `threads.list({})`
+ per-thread metadata reads, returns sorted ids; output contract unchanged.
Migration shim itself is Unit C — Unit B assumes metadata already holds the
records (KV legacy path untouched until C).

Failing tests first in `tests/done-rpc.test.ts` via `createFakePluginHost`
with SDK stubs: mark writes record + publishes; re-mark refreshes `doneAt`
preserving `keep`; clear issues `remove: ["done"]`; `done_list` reflects
metadata written directly through SDK stubs (metadata is source of truth);
archived threads drop out of `doneIds` (not in `threads.list`); sorting.
`app.tsx` untouched.

**Commits in this unit:** (pending)