---
type: checkpoint
timestamp: 2026-09-25T133900
responding-to: nothing (checkpoint after the UI work unit)
---

## Checkpoint: UI work unit green — 54 tests, typecheck clean, build passes

**Responding to:** nothing (results entry for the UI work unit).

- `tests/sweep-gather.test.ts` written first (red on missing
  `withSweepGather`), then implemented in `components/grouping.ts`:
  armed cards lead (armed order preserved), the rest keep relative order,
  unknown ids ignored, duplicates collapse, every card present exactly once.
- `components/board.tsx`: sweep button per column (Done + `idle-awhile` +
  `awhile` buckets), shown only when ≥ 1 eligible or armed; armed label
  `Sweep N → Archive ?`; armed column gathers via `withSweepGather` and
  eligible cards get the amber ring/tint via `isSweepHighlighted`.
  `useSweepClickAway` disarms on any pointer-down outside
  `[data-sweep-button]` and on Escape.
- `app.tsx`: one armed column at a time; `armSweepFor` captures
  `sweepCandidatesFor(columnId)` at arm time (frozen list);
  `confirmSweepFor` archives exactly the captured ids through bb's
  `actions.archive`; thresholds from `sweep_config_get` (defaults 7/30 on
  failure); keep flag optimistic update + `sweep_keep_set`; card menu gains
  "Keep from sweep" / "Allow sweep".
- `server.ts`: `done_list` now also returns `records` (per-thread
  `doneAt`/`keep`), preserving the `doneIds` shape.

Reds fixed along the way: a stale `useState` import after extracting the
click-away hook (typecheck caught it) and a duplicated state (`doneRecords`
vs `doneExtras`) consolidated into one source of truth.

Results: 54/54 tests pass, `npx tsc --noEmit` clean, `bb plugin build`
succeeds (dist artifacts build).

**Commits in this unit:** (posts before the code commit completing the unit)