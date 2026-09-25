---
type: checkpoint
timestamp: 2026-09-25T135730
responding-to: Unit C intent (this PR)
---

## Checkpoint: Unit C green — migration shim

**Responding to:** [Unit C intent](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

TDD round complete: red confirmed (9 failing), then the shim implemented
in
[server.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/server.ts)
to green. Behavior: on `done_list`, read legacy KV
`done-thread-ids`; plain `string[]` (main's shape) imports stamped at
import time — no age data existed to preserve; record-map (sweep sibling's
stopgap shape) imports preserving `doneAt` (epoch ms → ISO-8601) and
`keep`; an entry with no usable `doneAt` stamps at import time; malformed
entries and unexpected top-level shapes throw (fail loud). Import checks
each thread's existing record first, so re-runs never clobber live state
and a partial import converges on the next read; the KV key is deleted
only after every entry imported, then never read again — no KV index
retained.

12 new tests in
[tests/done-migration.test.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/tests/done-migration.test.ts)
(both legacy shapes, idempotence, KV deletion, no-op when absent, partial
import convergence, imported+native merge in one done_list, malformed
shapes rejected). Suite: 61 passed (4 files), `npx tsc --noEmit` clean.

Implementation is complete after this unit: scope items (1) RPC re-point +
shim, (2) lib helpers, (3) no frontend changes, (4) tests, (5) README
(verified unnecessary) are all covered. Remaining: coverage-matrix delta,
code review, PR ready flip.

**Commits in this unit:** (Unit C implementation commit, next entry's
footer)