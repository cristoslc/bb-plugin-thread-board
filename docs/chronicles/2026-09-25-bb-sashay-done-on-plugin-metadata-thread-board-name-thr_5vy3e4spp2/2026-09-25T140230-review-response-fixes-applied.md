---
type: review-response
timestamp: 2026-09-25T140230
responding-to: Unit C checkpoint (this PR)
---

## Review response: code review triaged and fixes applied

**Responding to:** [Unit C checkpoint](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

Ran the four-lens review (logic, style, docs, project-memory-conformance)
over the full `main...HEAD` diff via parallel subagents. Findings triaged;
fixes applied in the review-fixes commit:

- **Fixed (medium, logic):** migration-window resurrection — a `done_set`
  before the shim's first run left the legacy KV entry intact, and the
  next import re-imported the just-cleared thread. The shim now runs
  before both `done_list` and `done_set`, consuming legacy state before
  any metadata write. Regression test added (clear-before-import is not
  resurrected).
- **Fixed (medium, conformance):** record-map import silently stamped
  fresh on a missing or non-numeric `doneAt`, coercing malformed data.
  Now fails loud naming the thread (matches the settled never-coerce
  rule); two new inverse-assertion tests (missing doneAt, NaN doneAt).
- **Fixed (medium, conformance):** clear path carried an undocumented
  `set: {}` alongside the plan's remove-only update; now exactly
  `remove: ["done"]` per plan.
- **Fixed (style):** deduplicated the keep-flag conditional spread in the
  import (was repeated twice inside a nested ternary); deleted dead code
  (`IMPORT_WINDOW_STARTED`, `void record`); documented the `done-changed`
  payload shape change at the constant; replaced the `as never` cast with
  a typed `JsonValue` cast; annotated `readDoneRecord`'s return type;
  corrected the array case in `parseDoneRecord`'s error message; added
  trailing newlines to the new files.
- **Fixed (style):** the ~50-line fake-host setup + record reader
  duplicated across the two RPC test files moved to
  [tests/helpers/done-fake-host.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/tests/helpers/done-fake-host.ts),
  imported by both suites.
- **Not fixed (low, documented):** check-then-set race inside `importOne`
  (a concurrent write between read and import could be overwritten). The
  single-threaded RPC handler model plus the import-before-both-RPCs
  ordering makes this window unreachable from the plugin's own surfaces;
  the real residual risk is a concurrent CLI write from the sibling
  sashay, which lands after this merge and inherits the same ordering.
  Full elimination needs a host-level conditional write that SDK 0.5.9
  does not expose.

Suite: 63 passed (4 files), `npx tsc --noEmit` clean.

**Commits in this unit:** (review-fixes commit, next entry's footer)