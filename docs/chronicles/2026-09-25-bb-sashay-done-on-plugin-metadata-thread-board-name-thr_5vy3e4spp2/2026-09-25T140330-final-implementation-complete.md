---
type: final
timestamp: 2026-09-25T140330
responding-to: review-response entry (this PR)
---

## Final: implementation complete, PR ready

**Responding to:** [review-response entry](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

All scope items closed. Final state:

- **Storage:** done state lives entirely in per-thread plugin metadata
  (`threads.getPluginMetadata` / `updatePluginMetadata`, key `done` →
  `{ doneAt: ISO-8601, keep? }`, absent = not done). No KV index retained:
  the legacy `done-thread-ids` row is imported once (both legacy shapes)
  and deleted; the shim runs before `done_list` and `done_set`.
- **RPC:** contracts unchanged (`done_list` → `{ doneIds }` sorted;
  `done_set` → `{ done }`); `done-changed` publishes `{ threadId, done }`
  after every write.
- **Helpers:** [lib/done-metadata.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/lib/done-metadata.ts)
  — parse (fail loud), stamp (idempotent, keep-preserving), epoch adapter
  for the sweep sibling's `DoneAgeSource`.
- **Frontend:** `app.tsx` untouched (read path verified compatible).
- **README:** unchanged (verified it never documented the KV store).
- **Coverage matrix:** updated (done store rows re-pointed at metadata +
  shim row added).

Verification: 63 vitest tests across 4 files (15 helper, 11 RPC, 12
migration, 23 grouping, plus 2 review regression tests), all passing;
`npx tsc --noEmit` clean; suite ran green after every TDD round (red
confirmed before each implementation commit).

Review: four-lens subagent review (logic / style / docs /
project-memory-conformance); 2 medium findings fixed (resurrection race,
silent coercion), 1 medium fixed (remove-only clear), style findings
fixed or explicitly waived (check-then-set race documented as unreachable
from this plugin's surfaces pending the sibling's CLI, which inherits the
same import-first ordering).

Rebase notes for siblings: `done-changed` payload is now
`{ threadId, done }` (was `{ count }`); `done_list` output stays
`{ doneIds }` — the sweep sibling's `records` extension sources naturally
from the same per-thread metadata reads.

**Commits in this unit:** c2c919b