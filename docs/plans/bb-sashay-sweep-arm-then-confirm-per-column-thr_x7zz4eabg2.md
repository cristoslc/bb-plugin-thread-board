# Plan: Sweep (arm-then-confirm, per column) — `bb/sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2`

*2026-09-25 · from [docs/musings/2026-09-25-sweep.md](../musings/2026-09-25-sweep.md) · sibling context: [docs/musings/2026-09-25-done-state.md](../musings/2026-09-25-done-state.md)*

Per operator request: implement the sweep feature per the sweep musing, the
spec of record. Settled decisions there are NOT relitigated here.

## What ships

1. **Two sweep buttons, one per column.** The Done column and the Awhile-ago
   bucket columns (`idle-awhile` in Attention grouping; the `awhile` bucket in
   Last activity grouping) each get their own arm-then-confirm sweep button in
   the column header. They arm and fire independently; arming one disarms the
   other (one armed column at a time keeps the blast radius legible).

2. **Arm (first click).** The button activates, gains "?", and its label
   extends to `Sweep N → Archive`. Eligible cards in that column highlight
   (ring + tint) and gather at the top of the column so the blast radius reads
   at a glance. Nothing moves.

3. **Confirm (second click) archives exactly the captured list via bb's
   native `sdk.threads.archive` / sidebar action. Click-away (clicking
   anything that is not the armed button) disarms without archiving.
   Re-click on the button confirms. Escape also disarms.

4. **Frozen explicit list at arm time.** The captured thread-id set does not
   change while armed. A thread that crosses the threshold, gets marked Done,
   or updates after arming does NOT join the armed sweep — it becomes eligible
   for the next arm. The armed button's count is frozen with the list.
   (Musing open point resolved: the count freezes, matching the explicit-list
   decision — recomputing live would put cards into a blast radius the
   operator never saw at arm time.)

5. **Eligibility:**
   - **Done column:** a thread is sweep-eligible when it is done AND its age
     past the done-marked time ≥ `doneArchiveDays` (default 7) AND it is not
     overridden (`keep` flag). The done-marked time, not the thread's
     last-activity time, is the age basis — "Done a week ago" is about your
     attention, per the musing.
   - **Awhile-ago column:** long-idle threads — idle-state threads whose
     `updatedAt` is ≥ `idleArchiveDays` ago, not done, not pinned, not
     overridden. **Proposed threshold: its own setting `idleArchiveDays`,
     default 30** (proposal; the musing left this open). Rationale: Done
     threads are already mentally retired, so 7 days is generous there; an
     idle-but-not-done thread is only quiet, and archiving one at 7 days
     would swallow reference threads mid-project. The idle buckets already
     use 7 days as the "A while ago" boundary, so 30 keeps the first sweep
     eligible bucket strictly older than "A while ago" at arm time.
   - **Override safety valve:** per-thread keep flag, settable from the card
     menu ("Keep from sweep" / "Allow sweep"), honored by BOTH arms.
   - Eligibility is computed at arm time from a timestamp passed in
     (`now`), never `Date.now()` inside the pure functions — testability.

6. **`doneArchiveDays` setting** (default 7, integer ≥ 1) declared via
   `bb.settings.define`, editable with `bb plugin config thread-board set`.
   The board reads it over an RPC and re-reads on the settings realtime
   event, so an arm that is already open does not silently change thresholds
   under the operator (the frozen list stands; only future arms see the new
   threshold).

7. **Done-age storage — clean interface, not the landed schema.** The
   done-state musing's final lean (plugin thread-metadata namespace, stamped
   `doneAt`, optional `keep`) has NOT landed on trunk: the board's Done set
   is still the plugin-KV `done-thread-ids` list with no timestamps, and the
   sibling Done-state sashay (`thr_ev3ctjagqt`) is still unmerged. This
   sashay therefore:
   - Defines `DoneAgeSource` — an interface the board's sweep logic reads:
     `{ doneMarkedAt(threadId): number | null, kept(threadId): boolean }`.
   - Implements it over the **existing KV store** by stamping first-seen:
     `done_set(done: true)` records `Date.now()` for new entries; threads
     marked Done before this change have no stamp, and a thread without a
     stamp is treated as **not yet eligible** (never sweeps data it cannot
     date — fail-safe, fail-loud for the feature rather than guessing).
     When the done-state sashay lands its metadata-backed `doneAt`, the
     `DoneAgeSource` implementation swaps to read that; sweep logic does not
     change.
   - Stores the keep flag in the same KV record shape (per-thread map:
     `{ doneAt?: number, keep?: boolean }` keyed by thread id, one KV row
     per thread id prefix-listed in the existing row to keep the RPC shape).
   - The done-state sashay owns migrating KV → metadata; this one does not
     preempt it.

8. **Card menu additions:** "Keep from sweep" / "Allow sweep" toggle, and
   (for discoverability) nothing else — the sweep lives on the column.

## Not in scope

- The sweep's CLI surface (`bb thread-board sweep …`) — covered by the CLI
  musing and its own sashay (`thr_ev3ctjagqt`).
- Automatic aging on a schedule — rejected by the musing.
- Always-on eligibility markers (tick fringe, countdown chip) — musing calls
  them a refinement, not a requirement.
- Undo after the fact — bb's unarchive is already wired in the thread pane.
- Done-state storage migration to plugin metadata — done-state sashay's job.

## Files touched

| File | Change |
|------|--------|
| `server.ts` | Done-KV shape gains per-thread `{doneAt, keep}`; new RPC `sweep_config_get`, `sweep_keep_set`; done stamps on mark-done |
| `lib/sweep.ts` (new) | Pure eligibility + arm-list logic (unit-tested) |
| `app.tsx` | Sweep state (one armed column + frozen list), archive on confirm, keep-flag handling |
| `components/board.tsx` | Column sweep buttons (Done + awhile buckets), pass-through of armed set, card highlight + gather at top |
| `components/grouping.ts` | `sweepEligibleIds(column, …)` pure helpers; gather-at-top ordering while armed |
| `components/thread-card.tsx` | `isSweepHighlighted` prop, visual ring |
| `components/thread-card-menu.tsx` | No structural change (actions come from app.tsx already) |
| `tests/sweep.test.ts` (new) | Eligibility, threshold, override, frozen-list, arm/confirm semantics |
| `tests/grouping.test.ts` | Gather-at-top ordering while armed |
| `README.md` | Sweep line in "What it does" |

## Test plan (RGR where contracts precede implementation)

Unit (vitest, deterministic, `now`-injected):

- Done eligibility: fresh-done not eligible; ≥7d eligible; `keep` never; no
  stamp (pre-existing) never.
- Idle eligibility: <30d not eligible; ≥30d eligible; working/attention/
  unread never (only idle); done threads handled by the Done arm, not the
  idle arm; pinned never; `keep` never.
- Arm captures a frozen id list: late-arriving eligible thread is absent
  from the armed set; captured list archives exactly; disarm clears.
- Confirm archives exactly the captured list and nothing else (the archive
  call list is asserted).
- `Sweep N → Archive` label count matches the frozen list length.
- Threshold boundary: exactly at N days counts (age ≥ threshold).
- Settings plumbing: default 7 without config; `idleArchiveDays` default 30.
- Override: keep flag survives re-mark-done; set/clear round-trip through
  the RPC contract (zod schemas asserted).

Typecheck gate: `npx tsc --noEmit` must pass alongside `npm test`.

## Acceptance criteria

1. Done column shows "Sweep" when ≥1 eligible; arming highlights and gathers
   exactly the eligible set; label reads `Sweep N → Archive`.
2. Second click archives the captured N; late arrivals are untouched.
3. Click-away or Escape disarms; nothing moves.
4. Awhile-ago column (Attention and Last-activity groupings) arms separately
   with the same semantics for idle threads ≥ `idleArchiveDays` (default 30).
5. "Keep from sweep" on a card removes it from the current and future arms.
6. `bb plugin config thread-board set doneArchiveDays 14` is honored on the
   next arm.
7. Threads marked Done before this change are never auto-eligible (no
   timestamp known) — surfaced only when re-marked.
8. `npm test` and `npx tsc --noEmit` pass.