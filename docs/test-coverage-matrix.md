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
| Depth cap (two levels, `+N more`) | low | auto (per-child count, `tests/nesting.test.ts`) | auto (no chip when no grandchildren) | auto (count correct) | skip |
| Family-aware filter + search (`filterFamilies`) | low | auto (child match keeps family, `tests/nesting.test.ts`) | auto (no match drops family) | auto (non-matching members dimmed) | auto (promotion applied after filtering, project + provider) |
| Board assembly composition (`assembleBoard`) | low | auto (nested child appears once, `tests/nesting.test.ts`) | auto (promoted/cross-axis child never duplicated as nested row) | auto (chip counts all visible children incl. promoted) | skip (pure composition) |
| Mark thread done / not done (`done_set` RPC, card + pane actions) | medium (board write path; per-thread plugin metadata) | auto (`tests/done-rpc.test.ts` — stamp into `threads.updatePluginMetadata`, `done-changed` publish) | auto (re-mark is idempotent, refreshes `doneAt`, preserves `keep`) | auto (clear issues `remove: ["done"]`; unknown thread rejected by host) | skip |
| Done store: per-thread plugin metadata (`threads.getPluginMetadata`, key `done` → `{ doneAt: ISO-8601, keep? }`) | medium (board read path) | auto (`tests/done-rpc.test.ts` — `done_list` enumerates `threads.list` + per-thread reads, sorted) | auto (malformed record throws — fail loud; `tests/done-metadata.test.ts` parser contract) | auto (archived thread drops from `doneIds`; unarchive re-includes) | manual |
| Legacy KV migration shim (`done-thread-ids` → metadata, key deleted after import) | medium (rewrites legacy state once) | auto (`tests/done-migration.test.ts` — both legacy shapes import; KV deleted; rerun idempotent) | auto (unexpected/malformed legacy shapes throw) | auto (partial import converges on next read; imported+native ids merge) | manual |
| Done-record pure helpers (`lib/done-metadata.ts`: parse/stamp/epoch adapter) | low | auto (`tests/done-metadata.test.ts`) | auto (malformed record → throw; unparseable ISO → null) | auto (keep preserved across re-stamp; ISO millis + Z) | skip |
| Done-column sweep arm + confirm (age ≥ `doneArchiveDays`, default 7) | medium (archives threads) | auto (`tests/sweep.test.ts`) | auto (no stamp → ineligible) | auto (boundary at exactly N days) | auto (late arrival excluded from armed list; frozen list drives count/gather/highlight/confirm) |
| Awhile-ago sweep arm + confirm (idle ≥ `idleArchiveDays`, default 30) | medium (archives threads) | auto (`tests/sweep.test.ts`) | auto (non-idle states excluded) | auto (boundary at exactly N days) | auto (done threads not claimed by idle arm) |
| Sweep override: keep flag (set/clear, honored by both arms, persists for non-Done threads) | low | auto (`tests/keep-row.test.ts` round-trip; `tests/sweep.test.ts` override) | auto (corrupt row → null, warned) | auto (keep cleared → eligible again) | skip |
| Arm-then-confirm semantics (frozen list, disarm on click-away/Escape, count freeze, updater-pure confirm) | medium (blast-radius legibility) | auto (`tests/sweep.test.ts`, `tests/sweep-gather.test.ts`) | auto (disarm archives nothing) | auto (re-arm recaptures fresh eligibility; armed column with zero live count stays confirmable) | auto (arm Done, then arm idle disarms first) |
| Thread pane archive / unarchive | low | manual (bb-native `sdk.threads` surface, exercised by existing pane flows) | manual (archived thread stays open in pane) | manual | skip |
| Plugin settings (`doneArchiveDays`, `idleArchiveDays`) via `bb plugin config` | low | manual (`bb plugin config thread-board set …`) | auto (schema rejects non-integers via zod) | manual (default when unset) | skip |
| Ticket-ref detection (`findTicketRefs`: `PROJ-123`, `#N`, GitHub URLs) | low | auto (`tests/tickets.test.ts`) | auto (lowercase keys, `#0`, non-GitHub URLs rejected) | auto (dates/versions/mid-word guards, dedup across title+branch) | skip (pure ordering) |
| Ticket-chip link-out (repo base from `gitRemoteUrl`, href or inert chip) | low | auto (`tests/tickets.test.ts` href resolution) | auto (no base → no href) | auto (pull URL keeps its own href) | skip |
| GitHub status cache read (`readGitHubStatuses`, `tracker_status` RPC) | low (read-only external cache) | auto (`tests/tracker-status.test.ts` hit + live-cache probe) | auto (missing DB/table → empty map, no throw) | auto (partial match, empty ref list) | skip |

Auto = vitest (`npm test`). Manual = operator-assisted check during the
sashay's hand-to-operator step; no automated E2E exists for the embedded
board UI (browser-less plugin panel rendered by bb).