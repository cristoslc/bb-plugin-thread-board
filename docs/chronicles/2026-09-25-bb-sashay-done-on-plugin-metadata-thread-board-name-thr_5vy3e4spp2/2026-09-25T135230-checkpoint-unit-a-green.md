---
type: checkpoint
timestamp: 2026-09-25T135230
responding-to: Unit A intent (this PR)
---

## Checkpoint: Unit A green — pure helpers

**Responding to:** [Unit A intent](https://github.com/cristoslc/bb-plugin-thread-board/pull/4) in this PR.

TDD round complete: red confirmed (module missing → suite failed), then
[lib/done-metadata.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/lib/done-metadata.ts)
implemented to green. 15 new tests in
[tests/done-metadata.test.ts](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2/tests/done-metadata.test.ts)
covering: parse (valid / absent→null / malformed throws on non-object,
missing doneAt, non-ISO doneAt, wrong-typed keep); stamp (fresh from null,
re-mark refreshes doneAt, keep preserved, ISO-8601 with millis+Z); adapter
(epoch-ms round-trip, unparseable → null); settled key constant. Inverse
assertions present per test-driven-design rules.

Suite: 38 passed (2 files), `npx tsc --noEmit` clean. No skips.

**Commits in this unit:** (Unit A implementation commit, listed in next
entry's footer)