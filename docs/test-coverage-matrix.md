# Master test coverage matrix — bb-plugin-thread-board

Rows are workflow paths; columns are coverage classes (Happy / Sad / Edge /
Corner); the mechanism column names how each cell is verified. Blast radius
is per the binary gate — no path here touches Safety, Security, Financial,
Privacy, Availability, or Integrity beyond board-local plugin state, so
happy-path coverage suffices except where a cell is filled anyway.

| Workflow path | Blast radius | Happy | Sad | Edge | Corner |
|---------------|--------------|-------|-----|------|--------|
| Group threads into columns (`buildColumns`, `columnFor`) | low | auto (`tests/grouping.test.ts`) | auto (unknown group-by falls back) | auto (frozen column, pinned, done ordering) | skip (pure ordering) |
| Filter + search threads (`filterThreads`, `matchesFilter`) | low | auto | auto (no match → empty) | auto (multi-dim intersection) | skip |
| Family index (`buildFamilyIndex`) | low | auto (`tests/nesting.test.ts`) | auto (orphan → root) | auto (hidden/archived excluded) | auto (cycle tolerated) |
| Nesting placement, Attention grouping (`nestUnderParents`) | low | auto (`tests/nesting.test.ts`) | auto (equal-rank child nests) | auto (done parent, live child promotes) | auto (promoted child keeps column sort) |
| Nesting placement, axis groupings | low | auto (same-axis nests, `tests/nesting.test.ts`) | auto (cross-axis child standalone) | auto (recency/none always nest) | skip (pure placement) |
| Depth cap (two levels, `+N more`) | low | auto (`tests/nesting.test.ts`) | auto (no chip when no grandchildren) | auto (count correct) | skip |
| Family-aware filter + search (`filterFamilies`) | low | auto (child match keeps family, `tests/nesting.test.ts`) | auto (no match drops family) | auto (non-matching members dimmed) | auto (promotion applied after filtering) |
| Mark thread done / not done (`done_set` RPC, card + pane actions) | low | auto (RPC schema round-trip in `tests/sweep.test.ts`) | auto (re-mark is idempotent) | auto (no timestamp → never sweep-eligible) | skip |
| Done-column sweep arm + confirm (age ≥ `doneArchiveDays`, default 7) | medium (archives threads) | auto (`tests/sweep.test.ts`) | auto (no stamp → ineligible) | auto (boundary at exactly N days) | auto (late arrival excluded from armed list) |
| Awhile-ago sweep arm + confirm (idle ≥ `idleArchiveDays`, default 30) | medium (archives threads) | auto (`tests/sweep.test.ts`) | auto (non-idle states excluded) | auto (boundary at exactly N days) | auto (done threads not claimed by idle arm) |
| Sweep override: keep flag (set/clear, honored by both arms) | low | auto (`tests/sweep.test.ts`) | auto (keep survives re-mark-done) | auto (keep cleared → eligible again) | skip |
| Arm-then-confirm semantics (frozen list, disarm on click-away/Escape, count freeze) | medium (blast-radius legibility) | auto (`tests/sweep.test.ts`) | auto (disarm archives nothing) | auto (re-arm recaptures fresh eligibility) | auto (arm Done, then arm idle disarms first) |
| Thread pane archive / unarchive | low | manual (bb-native `sdk.threads` surface, exercised by existing pane flows) | manual (archived thread stays open in pane) | manual | skip |
| Plugin settings (`doneArchiveDays`, `idleArchiveDays`) via `bb plugin config` | low | manual (`bb plugin config thread-board set …`) | auto (schema rejects non-integers via zod) | manual (default when unset) | skip |

Auto = vitest (`npm test`). Manual = operator-assisted check during the
sashay's hand-to-operator step; no automated E2E exists for the embedded
board UI (browser-less plugin panel rendered by bb).