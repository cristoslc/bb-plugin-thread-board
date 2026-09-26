---
type: checkpoint
timestamp: 2026-09-25T224401
responding-to: revival brief from thr_u6dkz2h77a; the decision entry on the revival merge strategy
---

## Checkpoint: CLI rebased onto main's post-#4/#1/#2 server — green

**Responding to:** revival brief from thr_u6dkz2h77a; the decision entry
"revival merge strategy" from earlier today.

The CLI layer landed on top of main's server (f9b40ba) as planned in the
revival decision: main's metadata-backed done store, KV keep store,
settings, and RPCs were kept wholesale; the CLI layer was appended and
adapted to main's shapes. Specifically:

- `lib/sweep-cli.ts` (new): CLI-side pure eligibility over server-side
  thread rows + `DoneRecord` + merged keep (metadata OR KV store).
  Done-below-threshold threads are never claimed by the idle arm; pinned
  threads are idle-ineligible (matching main's board arm).
- `server.ts`: appended the `bb.cli.register(defineCli(...))` section —
  `done list/mark/clear`, `sweep` (dry-run exit 1 / `--confirm` /
  `--ids` frozen-list), `config show/set` (bounds mirroring main's
  settings schemas: 1–365 / 1–3650). Added the `done-index` KV
  (best-effort orphan reporting for deleted threads) wired into main's
  `writeDoneRecord` and `importOne` so board RPC, CLI, and legacy import
  all index. CLI writes publish main's `{ threadId, done }` payload.
- Tests adapted to main's stack: `tests/cli.test.ts` (27),
  `tests/sweep-cli.test.ts` (16). The unknown-age-record tests from the
  pre-revival build are gone (main's import stamps legacy ids at import);
  new tests cover KV-store keep for never-done threads and the clear ≠
  allow-sweep rule.

**Results:** `npm test` 233/233 passed (190 existing + 43 CLI),
`npx tsc --noEmit` clean. Per operator request, the revival brief's
constraints are all met: metadata `done` shape only, main's server taken
wholesale, standing rule respected.

**Commits in this unit:** (this commit, see branch log)