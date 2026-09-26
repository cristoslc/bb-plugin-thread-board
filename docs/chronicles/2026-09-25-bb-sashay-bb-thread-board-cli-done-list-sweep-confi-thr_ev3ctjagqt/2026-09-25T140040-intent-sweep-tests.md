---
type: intent
timestamp: 2026-09-25T140040
responding-to: checkpoint 2026-09-25T140024 (CLI done/config tests shipped)
---

## Work unit 3: sweep tests — dry-run exit 1, --confirm archives, --ids narrowing, keep/archived rules

**Responding to:** the unit-2 checkpoint — the CLI exists; the sweep is
its only destructive subcommand, so this unit pins its confirmation
surface and eligibility rules.

Plan: via `harness.behavior.runCli` with the archive stub recording
calls — dry-run prints the eligible set and exits 1 with zero archive
calls (including the no-eligible case); `--confirm` archives exactly the
resolved set (assert `harness.inspection.sdk.callsTo("threads.archive")`
argument lists); `--ids` narrows the dry-run print and, with
`--confirm`, archives exactly the named ids even when others also
qualify (frozen-list semantics); `keep` threads never archived;
already-archived threads skipped; boundary at exactly N days eligible;
settings respected (`config set` changing a threshold changes the
sweep); `--json` shapes for both modes; missing `--ids` values rejected
by the parser.

**Commits in this unit:** none yet