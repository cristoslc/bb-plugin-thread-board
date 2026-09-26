---
type: intent
timestamp: 2026-09-25T135625
responding-to: checkpoint 2026-09-25T135113 (done metadata migration shipped)
---

## Work unit 2: CLI tests — done list/mark/clear + config show/set over the registered CLI

**Responding to:** the migration checkpoint — the store now exists; this
unit exercises the `bb thread-board` CLI surface against it and the
settings.

Plan: via `harness.behavior.runCli`, cover `done list` (--json shape,
empty list, migrated/missing-from-live-list marking), `done mark`
(stamp, idempotent refresh, multi-id), `done clear` (idempotent on
non-done), `config show` (defaults + overridden flag), `config set`
(happy, unknown key → PluginCliError naming valid keys, 0/negative/
non-integer rejection), plus a `--help` render and unknown-option
failure-expecting test. Archive stubbing stays out of this unit (sweep
is unit 3).

**Commits in this unit:** none yet