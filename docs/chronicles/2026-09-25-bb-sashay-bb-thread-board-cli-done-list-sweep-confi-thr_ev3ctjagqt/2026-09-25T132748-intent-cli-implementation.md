---
type: intent
timestamp: 2026-09-25T132748
responding-to: nothing (intent post for the implementation work unit)
---

## Intent: implement `bb thread-board` CLI (done list/mark/clear, sweep, config)

**Responding to:** nothing (intent post for next work unit)

Per operator request: implement the CLI command surface for the Thread
Board plugin as a sashay, per the charter musing
[docs/musings/2026-09-25-cli-command.md](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt/docs/musings/2026-09-25-cli-command.md) and the plan at
[docs/plans/bb-sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt.md](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt/docs/plans/bb-sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt.md).

Next work unit: migrate Done storage from the KV list to per-thread
plugin metadata (the Done-state musing's settled decision), then build
the `defineCli` registration — `done list/mark/clear`, `sweep`
(dry-run + `--confirm` + `--ids`), `config show/set` — backed by
`bb.settings.define` descriptors `doneArchiveDays` (7) and
`idleArchiveDays` (30, key aligned with the sibling sweep sashay's plan).

**What success looks like:** `npm test` and `npx tsc --noEmit` pass with
new tests covering every delta path in the plan's pre-test inventory;
`bb thread-board --help` renders from the declaration; the board UI's
`done_list`/`done_set` RPC keeps working over the new storage.

**Commits in this unit:** none yet