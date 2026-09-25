# Plan: Done state moves to plugin metadata (board server-side storage)

*Sashay plan · 2026-09-25 · thread `thr_5vy3e4spp2` · branch
`bb/sashay-done-on-plugin-metadata-thread-board-name-thr_5vy3e4spp2`*

Charter: `docs/musings/2026-09-25-done-state.md`, "The dependency question,
settled" — settled, not relitigated here. Storage-surface siblings this plan
coordinates with (does not redo):

- **Sweep sashay** (`thr_x7zz4eabg2`, PR #1 draft, branch tip `7e8be09`):
  landed `lib/sweep.ts` with the `DoneAgeSource` interface
  (`doneMarkedAt(threadId): number | null`, `kept(threadId): boolean`) and a
  `bb.storage.kv` records stopgap in `server.ts`. This sashay supplies the
  metadata-backed store its interface anticipated; the `DoneAgeSource`
  contract stays intact (adapter converts ISO-8601 → epoch ms).
- **CLI sashay** (`thr_ev3ctjagqt`, plan on main
  `docs/plans/bb-sashay-bb-thread-board-cli-done-list-sweep-confi-thr_ev3ctjagqt.md`):
  specifies this exact migration (metadata-backed RPC, `lib/done-metadata.ts`
  pure helpers, idempotent re-mark refreshing `doneAt`, `done-changed`
  published after writes). This sashay owns the `server.ts` storage layer;
  theirs owns the CLI surface on top of it. Record shape follows their plan;
  nothing here contradicts it.

## Settled inputs

1. Done = bb-native thread plugin metadata: `threads.getPluginMetadata` /
   `threads.updatePluginMetadata`, `pluginId: "thread-board"` (SDK defaults
   it server-side via `bb.sdk`), key `"done"` →
   `{ doneAt: ISO-8601 string, keep?: boolean }`. Absent key = not done.
2. `doneAt` is an **ISO-8601 string** (musing is settled; the sweep
   sibling's epoch-ms `doneAt` in its KV stopgap is its branch-local shape —
   the `DoneAgeSource` number contract is served by an adapter, not by
   changing the settled shape).
3. Metadata writes emit no thread realtime event (verified) — the board's
   `done-changed` realtime publish stays.
4. No bulk metadata read exists in SDK 0.5.9 (verified: `threads.list`
   carries no `pluginMetadata` include).

## Design resolution: metadata is the only store; the KV stopgap is retired

The charter says the migration shim imports KV `"done-thread-ids"` entries
into per-thread metadata on first read, "then stops reading KV". Two ways to
read that, resolved here:

- **Chosen: no KV index at all.** After the one-time import, `done_list`
  enumerates via `threads.list({})` (one call) and reads each thread's
  metadata (`threads.getPluginMetadata`). Done threads are the subset
  carrying the `"done"` key. The KV key is deleted after import.
- Rejected alternative: keep `"done-thread-ids"` as a pure id enumerator
  with metadata as record source. Faster on paper (O(done) instead of
  O(threads) metadata reads per refresh) but it keeps a second copy of
  done-membership state, needs staleness re-validation, and contradicts
  both the charter's "stops reading KV" and the CLI plan's "the storage
  moves from `bb.storage.kv` to per-thread plugin metadata". Board-scale
  thread counts make O(threads) in-process metadata reads per refresh a
  non-issue (the host resolves them from a Map; refreshes happen on mount
  and on `done-changed`, not per frame).

Consequences:

- A done thread that gets archived leaves `doneIds` (it is not in
  `threads.list({})` by default) and re-enters if unarchived — metadata
  survives, so the state is never lost. Strictly better than the KV list.
- `done_list` output shape is unchanged from main: `{ doneIds: string[] }`,
  sorted. The sweep sibling's extended output (`records`) merges at its
  rebase; at that point `records` is sourced from the same metadata read
  this sashay performs — no second read needed.
- `done-changed` payload changes from `{ count }` to `{ threadId, done }`:
  with no KV index there is no O(1) total count anymore, and the only
  consumer today (`app.tsx`) triggers a refetch on the event without
  reading the payload. Cheap and precise. Noted as a rebase point for the
  sweep sibling.

## Scope

1. `lib/done-metadata.ts` (new) — pure helpers, no host dependency:
   - `DONE_METADATA_KEY = "done"`; record type `{ doneAt: string, keep?: boolean }`.
   - `parseDoneRecord(value: JsonValue | undefined)` → record | null;
     throws on a malformed present value (fail loud, never coerces).
   - `stampDone(existing: record | null, now: Date)` → record; fresh
     `doneAt` (idempotent re-mark refreshes, matching the CLI plan),
     preserves `keep` when present.
   - `doneAtToEpochMs(iso: string)` → number | null — the adapter for the
     sweep sibling's `DoneAgeSource.doneMarkedAt` number contract.
2. `server.ts` — re-point the storage layer:
   - `done_set`: `done: true` → `updatePluginMetadata({ threadId, set: { done: record } })`
     (fresh `doneAt`, preserve `keep`); `done: false` →
     `updatePluginMetadata({ threadId, remove: ["done"] })`. Both
     idempotent. Publish `done-changed` with `{ threadId, done }` after
     every successful write.
   - `done_list`: `threads.list({})` + per-thread
     `getPluginMetadata`; return sorted ids of threads carrying the
     `"done"` key. Output contract unchanged.
   - Migration shim: on first `done_list` call, read legacy KV
     `"done-thread-ids"`; for each entry lacking a `"done"` metadata key,
     import it (stamped `doneAt: <import time ISO>` for the plain string[]
     form main wrote; the sweep sibling's KV record-map form imports
     preserving `doneAt` converted epoch-ms → ISO-8601, and `keep`);
     then delete the KV key. Idempotent and crash-safe by construction:
     a partial import leaves the remaining KV entries in place and the
     next run finishes the job (import checks for an existing `"done"`
     key first). Only `done_list` runs the shim — `done_set` writes fresh
     state, and unimported legacy ids persist in KV until the next read.
   - RPC input/output zod contracts unchanged (`done_list` null input,
     `{ doneIds }` output; `done_set` `{ threadId, done }` → `{ done }`).
3. `app.tsx` — **no changes** (verified feasible: it consumes
   `result.doneIds` and refetches on `done-changed`).
4. Tests (vitest, TDD red-green per unit below) using
   `@get-bb/plugin-sdk/testing`'s `createFakePluginHost` with SDK stubs for
   `threads.getPluginMetadata` / `updatePluginMetadata` / `list`, plus the
   fake host's KV for legacy-shim data.
5. README — no change (verified: it never mentions KV or server-side
   done storage on main).

## Work units (TDD, each red → green → full suite + `npx tsc --noEmit`)

- **Unit A — `lib/done-metadata.ts` pure helpers.** Failing tests first in
  `tests/done-metadata.test.ts`: parse accepts valid records / absent →
  null / **throws** on malformed present values (inverse-assertion:
  non-ISO `doneAt`, non-object, wrong-typed `keep`); stamp gives fresh
  `doneAt`, preserves `keep`, works from null; `doneAtToEpochMs` round-trips
  and returns null on unparseable input (inverse-assertion).
- **Unit B — metadata-backed RPC.** Failing tests first in
  `tests/done-rpc.test.ts` via `createFakePluginHost`:
  `done_set(true)` writes the record into the thread's board-metadata
  namespace and publishes `done-changed`; re-mark refreshes `doneAt` and
  preserves `keep` (idempotence); `done_set(false)` issues a
  `remove: ["done"]` update and the id disappears from `done_list`;
  `done_list` reflects metadata written directly through stubbed SDK calls
  (proving metadata is the source of truth, not any index); sorting holds.
- **Unit C — migration shim.** Failing tests first: legacy main KV
  string[] imports to per-thread metadata with import-time `doneAt`; sweep
  sibling KV record-map imports preserving `doneAt` (converted to ISO) and
  `keep`; KV key deleted after a complete import; second run is a no-op;
  partial-import crash scenario converges on the next `done_list`.

## Pre-test inventory (delta)

Baseline before any change: `npm test` (existing `tests/grouping.test.ts`)
and `npx tsc --noEmit` both green on `f67d196`.

| Path | Blast radius | Happy | Sad | Edge | Corner |
|------|--------------|-------|-----|------|--------|
| `parseDoneRecord` | low | auto | auto (malformed → throw) | auto (absent → null) | manual |
| `stampDone` | low | auto | auto (null existing) | auto (keep preserved, doneAt refreshed) | manual |
| `doneAtToEpochMs` | low | auto | auto (unparseable → null) | auto (ISO with millis/timezone) | manual |
| RPC `done_set` (metadata) | **medium** (board write path) | auto | auto (host rejects unknown thread — fail loud, no coercion) | auto (re-mark idempotence, keep preservation) | manual |
| RPC `done_list` (metadata) | **medium** (board read path) | auto | auto (no done threads → empty) | auto (archived done thread excluded; unarchive re-includes) | manual |
| `done-changed` publish | low | auto | auto (payload shape) | auto (publish on every write incl. re-mark) | manual |
| Migration shim | **high** (rewrites legacy state) | auto | auto (empty/absent KV → no-op) | auto (both legacy shapes; KV deleted; idempotent rerun) | manual |

Integrity is the only risk category that fires (done state must round-trip
board ↔ CLI, and the shim rewrites legacy state) — beyond-happy-path
coverage is required and declared above. No live-host manual steps planned;
corner cells fall to an optional live `bb` smoke check by the operator.

## Coverage-matrix delta

`docs/test-coverage-matrix.md` rows for the `done_set` RPC gain their
storage-mechanism note updated KV → plugin metadata; the migration shim is
a new auto-tested row (done during implementation, not here).

## Test command

`npm test` (vitest) and `npx tsc --noEmit` — both must pass. Already
declared in the repo root `AGENTS.md` with the coverage-matrix pointer; no
new declaration needed.

## Out of scope

- The sweep sashay's arm-then-confirm UI, its KV records, its settings —
  untouched here; its `DoneAgeSource` contract is served by this store via
  the adapter at its rebase.
- The CLI sashay's command surface — it consumes this storage layer as its
  plan already specifies.
- No README/storage-documentation changes (main's README never named KV).
- No bulk-metadata API work against the SDK; `threads.list` + per-thread
  reads are the accepted cost.