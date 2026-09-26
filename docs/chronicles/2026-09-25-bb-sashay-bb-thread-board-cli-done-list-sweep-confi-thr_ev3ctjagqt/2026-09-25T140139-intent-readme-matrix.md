---
type: intent
timestamp: 2026-09-25T140139
responding-to: checkpoint 2026-09-25T140123 (sweep tests shipped)
---

## Work unit 4: README correction + CLI section, coverage-matrix rollup

**Responding to:** the unit-3 checkpoint — implementation complete; this
unit fixes the docs the plan calls out.

Plan: reword the README's "makes no server-side writes" line per the
Done-state musing's README-correction section (the board reads thread
content live and writes through bb's own stores — pins, Done marks,
sweep archives — while owning only its declared small state), add a
`bb thread-board` CLI section covering the six subcommands and the
confirm-flag friction rule, and roll the plan's delta rows into
`docs/test-coverage-matrix.md` (auto cells where the new tests cover
them, manual for corners with no automated harness). Then `bb plugin
build` as the closing check.

**Commits in this unit:** none yet