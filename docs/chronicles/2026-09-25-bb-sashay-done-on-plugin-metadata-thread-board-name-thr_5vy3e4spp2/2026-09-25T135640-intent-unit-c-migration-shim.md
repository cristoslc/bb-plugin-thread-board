---
type: intent
timestamp: 2026-09-25T135640
responding-to: Unit B checkpoint (this PR)
---

## Intent: Unit C — migration shim for legacy KV done ids

**Responding to:** [Unit B checkpoint](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

On `done_list`'s first read: import legacy KV `"done-thread-ids"` entries
into per-thread metadata, then delete the KV key. Two legacy shapes to
handle (the sweep sibling wrote both over its lifetime on main-lineage
code): main's plain `string[]`, and the sibling branch's
`Record<threadId, { doneAt?: number, keep?: boolean }>` record-map — plain
ids import stamped at import time (no age data existed to preserve);
record-map entries import preserving `doneAt` (epoch ms → ISO-8601) and
`keep`. Import checks for an existing `"done"` metadata key first, so it
is idempotent and crash-safe: a partial import leaves remaining KV entries
in place and the next `done_list` finishes the job. After a complete
import the KV key is deleted and never read again — no KV index retained.

Failing tests first: plain-shape import stamps all ids; record-map import
preserves doneAt+keep; unknown/absent shapes fail loud; KV key deleted
after complete import; second run is a no-op; partial-import (simulated
crash between imports) converges on the next read.

**Commits in this unit:** (pending)