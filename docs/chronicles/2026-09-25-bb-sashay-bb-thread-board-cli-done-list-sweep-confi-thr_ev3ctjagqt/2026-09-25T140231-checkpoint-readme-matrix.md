---
type: checkpoint
timestamp: 2026-09-25T140231
responding-to: intent 2026-09-25T140139 (README + matrix rollup)
---

## Checkpoint: README and coverage matrix updated; bundle builds

**Responding to:** the unit-4 intent — doc corrections and matrix rollup.

What shipped in commit `daf7cdb`:

- `README.md` — the "makes no server-side writes" line reworded per the
  Done-state musing's correction section: the board reads thread content
  live and writes through bb's own stores (pins, Done marks, sweep
  archives) while owning only its declared Done state. New CLI section:
  the six subcommands, the sweep's confirm-flag friction rule
  (dry-run prints + exits 1; `--ids` frozen-list semantics), the
  eligibility thresholds, and the settings-page pairing.
- `docs/test-coverage-matrix.md` — delta rows added for `done list`,
  `done mark`, `done clear`, sweep dry-run / `--confirm` /
  `--ids --confirm`, `config show/set`, RPC-over-metadata, and the
  metadata storage + KV migration; auto cells where the new suites
  cover them, manual corners for live-host checks. No existing rows
  deleted.

Verification: `npm test` 89 passed (89), `npx tsc --noEmit` clean,
`bb plugin build` produced dist artifacts without error.

**Commits in this unit:** daf7cdb