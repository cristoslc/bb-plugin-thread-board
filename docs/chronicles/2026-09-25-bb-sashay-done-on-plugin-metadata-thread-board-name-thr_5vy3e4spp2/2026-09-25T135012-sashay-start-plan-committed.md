---
type: intent
timestamp: 2026-09-25T135012
responding-to: nothing (sashay start; operator request to implement the done-state migration per docs/musings/2026-09-25-done-state.md)
---

## Sashay start: plan committed

**Responding to:** nothing (sashay start — per operator request: implement
Done-on-plugin-metadata for the board per the settled Done-state musing).

Plan written to
[docs/plans/bb-sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2.md](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/docs/plans/bb-sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2.md)
and committed to trunk lineage (70035f9, on the sashay branch which sits at
main's tip f67d196; main-side push happens at PR merge, matching how the
sibling sashays handled it).

Key plan decisions captured: Done storage = per-thread plugin metadata
(`pluginId: "thread-board"` — SDK-defaulted server-side, key `"done"` →
`{ doneAt: ISO-8601, keep? }`, absent = not done); after a one-time
migration shim imports the legacy KV `"done-thread-ids"` entries into
metadata and deletes the key, `done_list` enumerates via `threads.list({})`
+ per-thread `getPluginMetadata` — **no KV index retained** (charter's
"stops reading KV" read literally; the pure-index alternative was rejected
in the plan as duplicate membership state needing staleness re-validation).
`done-changed` payload changes from `{ count }` to `{ threadId, done }` —
no O(1) count exists without an index, and the only consumer refetches on
the signal without reading the payload. Sweep sibling's `DoneAgeSource`
number contract served by a `doneAtToEpochMs` adapter (its epoch-ms KV
`doneAt` is branch-local and does not override the settled ISO-8601 shape).

Work units ahead (TDD, red-green each): A — `lib/done-metadata.ts` pure
helpers (parse/stamp/adapter, malformed record throws); B —
metadata-backed RPC in `server.ts`; C — migration shim (both legacy KV
shapes, idempotent, key deleted after complete import). Baseline verified
green: `npm test` + `npx tsc --noEmit` on f67d196. Frontend `app.tsx` and
README: no changes (read path and docs verified unaffected).

**Commits in this unit:** 70035f9