# Plan: Parent-child thread nesting — `bb/sashay-parent-child-nested-cards-thr_aap36j6yz4`

*2026-09-25 · from [docs/musings/2026-09-25-parent-child-nesting.md](../musings/2026-09-25-parent-child-nesting.md) · sibling context: [docs/plans/bb-sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2.md](bb-sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2.md)*

Per operator request: implement nested cards, Jira-subissue style. Settled
points in the musing are NOT relitigated here. The musing's open design
questions are answered below as proposals.

## Verified facts this plan builds on

- `parentThreadId: string | null` and `lifecycleOwnerThreadId: string | null`
  are on the live sidebar thread schema (`bb-plugin-sdk-app.d.ts:13015`); the
  `parent-changed` realtime event exists (`bb-plugin-sdk-app.d.ts:341`), so
  re-parenting updates live through the existing `experimental_useSidebarThreads`
  stream. No new SDK surface.
- **Hidden children:** the live sidebar view DOES include hidden threads —
  `isHidden: boolean` is documented as "threads bb keeps out of its own list
  (internal helper threads a plugin spawned with `visibility: "hidden"`). The
  array includes them so a list that wants them can show them"
  (`bb-plugin-sdk-app.d.ts:17351`). The board filters `isHidden` at
  `app.tsx:174`. Decision: the board stays aligned with the sidebar's
  exclusion — hidden children never render, nested or otherwise. A parent
  whose only children are hidden renders as a plain card, no nest, no
  expander. Documented here because the musing flagged it as open.
- No sweep code exists on trunk yet (the sweep sashay `thr_x7zz4eabg2` is
  unmerged). The sweep-family rule is therefore a **contract recorded here**,
  not code in this sashay.

## Design decisions (the musing's open questions)

1. **Column placement — the hard rule first: never hide a Needs-you child.**
   In Attention grouping, a child is *promoted*: it renders as a standalone
   card in its own state's column whenever that column precedes the parent's
   column in the board's column order (`STATUS_COLUMN_ORDER` /
   `RECENCY_COLUMN_ORDER`). Concretely:
   - Needs-you child under a non-Needs-you parent → the child stands alone in
     the Needs-you column. Always visible in the column sweep. (Promoted, not
     duplicated — the family may split across columns; the columns are states
     of the same work, and the parent card still shows the child-count chip.)
   - Unread child under a Working or Idle parent → promoted to the Unread
     column. Unread child under a Needs-you parent → nests (parent outranks).
   - Working child under an Idle parent → promoted to Working. Idle child →
     always nests.
   - Needs-you child under a Needs-you parent → nests (same column anyway).
   In non-Attention groupings the columns are not state-ranked, so no
   promotion: the family stays together (decision 2 decides *where*).

2. **Cross-project / cross-machine / cross-provider children.** In Project,
   Provider, or Machine grouping, a child nests under its parent iff its axis
   key (project id / provider id / machine id) matches the parent's.
   Otherwise the child falls back to **flat rendering**: a normal independent
   card in its own axis column (it carries its own project mark / machine
   name on the card, which the existing card footer already renders). A
   cross-axis child never silently rides a grouping it doesn't belong to.
   In Recency and None groupings the family always nests together
   (recency is per-thread presentation, not a grouping boundary a child
   would violate).

3. **Depth cap: two levels, then a count.** Parent card renders its live
   children (level 1). A level-1 child that itself has live children does not
   render them; it shows a `+N more` overflow chip (N = its visible
   grandchild count) that opens the thread pane. Matches the musing's lean.

4. **Filters select families; the family renders whole.** A root family
   passes the state/project/provider filters and search when ANY of its
   visible members passes. Every visible member of a passing family renders;
   members that do not themselves match the active filters render dimmed
   (opacity), matching members render normal. Consequences:
   - A state filter of Needs-you that matches only a child surfaces the
     family — the child renders normal, the parent dimmed. The child is
     never orphaned from its context (the musing's candidate, adopted).
   - The hard rule survives filtering: the promoted-child rule (decision 1)
     is applied after family-filtering, so the Needs-you child also stands
     alone in the Needs-you column.
   - Search behaves the same way (a title/id hit on any member keeps the
     family, non-members dimmed).

5. **Sweep-family contract (for the sweep sashay; not implemented here).**
   When the sweep lands, eligibility computed at arm time MUST be
   family-aware: a thread with ≥1 live (non-archived) child is
   **never sweep-eligible** in either arm (Done or Awhile-ago), regardless
   of its own age or keep flag. Children are eligible independently of their
   parent. Archiving a family is a no-op direction the sweep never takes —
   bb's parent lifecycle notifications make child completion observable, so
   a parent's children going quiet is visible between arms. Cross-reference
   recorded; the sweep plan owns the implementation.

6. **Archived/deleted parents (orphans).** A child whose parent is not in
   the visible set (hidden, archived, deleted) renders as an ordinary
   standalone card — flat fallback, no special marking.

7. **Collapse.** Parent cards with live children show a chevron toggle and a
   child-count chip. Default expanded; collapse state is per-card,
   in-memory (component state), not persisted — the board reads at a glance
   and a stale saved collapse state would hide children across reloads.

8. **Done / pinned interplay.** A Done parent keeps its nested children
   (rendered dimmed via the existing done opacity). A pinned parent keeps
   its family with it in the Pinned column. Live children of a Done parent
   follow the promotion rule (decision 1) — Done is the board's rightmost
   lane, so any live child's state column precedes it and promotes.

## What ships

1. `components/nesting.ts` (new, pure, unit-tested):
   - `buildFamilyIndex(threads)` → parent→children and child→parent maps,
     built from the visible (non-hidden, non-archived) set. Cycle-tolerant
     (a corrupt `parentThreadId` cycle must not hang the board; cycles are
     treated as roots — defensive, bb owns the data).
   - `nestUnderParents(columns, threads, groupBy, context, now)` →
     `{ columns, childrenByParent }`: pulls nested children out of their
     column placement and attaches them under their parent; applies the
     promotion rule (decision 1) and the axis-match rule (decision 2);
     children keep in-column sort (pinned-first, newest-first).
   - `filterFamilies(threads, familyIndex, filter, searchQuery)` →
     family-aware filtering (decision 4), returning
     `{ kept: PluginSidebarThread[], dimmedIds: ReadonlySet<string> }`.
   - `grandchildCountFor(…)` → the `+N more` number (decision 3).

2. `components/grouping.ts`: export `STATUS_COLUMN_ORDER` (currently
   module-private) so nesting.ts can compare column precedence without
   duplicating the order.

3. `app.tsx`: pipeline becomes
   `visibleThreads → filterFamilies → search → buildColumns →
   nestUnderParents`; passes `childrenByParent` and `dimmedIds` to `Board`.

4. `components/board.tsx`: passes each parent's nested children into its
   `ThreadCard`; column header counts and empty-state logic count top-level
   cards only (nested children are represented on the parent's chip).

5. `components/thread-card.tsx`:
   - New optional props: `childThreads`, `dimmed`, collapse toggle.
   - Children render beneath the card body: indented compact rows (state
     dot, truncated title, relative time), each an anchor using the child's
     own `href`, click opens the pane, right-click gets the same menu
     actions as any card (`menuActionsFor`).
   - Subordinate styling: smaller text, muted, left rail indent.
   - `+N more` chip at the end of the child list (decision 3); chevron +
     count in the parent header row (decision 7).

6. Tests (`tests/nesting.test.ts`, new; `tests/grouping.test.ts` extended):
   see Test plan.

7. `README.md` one line under "What it does": parent-child nesting.

8. `docs/test-coverage-matrix.md`: new rows (below).

## Not in scope

- Spawning or re-parenting threads from the board (no card menu action;
  bb-native surfaces own parenting).
- Sweep implementation — its own sashay owns it (contract in decision 5).
- `lifecycleOwnerThreadId` — orthogonal to rendering; not read.
- Persisting collapse state.
- Rendering hidden children (decision: stay aligned with the sidebar).

## Files touched

| File | Change |
|------|--------|
| `components/nesting.ts` (new) | Family index, nesting/placement, family filtering, depth-cap count (pure) |
| `components/grouping.ts` | Export `STATUS_COLUMN_ORDER` |
| `app.tsx` | Wire family filter → columns → nesting; new props to Board |
| `components/board.tsx` | Thread children pass-through; top-level-only column counts |
| `components/thread-card.tsx` | Nested children, chevron/collapse, dimming, `+N more` chip |
| `tests/nesting.test.ts` (new) | All nesting behavior |
| `tests/grouping.test.ts` | Column-precedence export used by nesting; buildColumns unaffected |
| `docs/test-coverage-matrix.md` | Nesting rows |
| `README.md` | Nesting line |

## Test plan (RGR where contracts precede implementation)

Unit (vitest, deterministic; `now` injected where age matters):

Family index:
- Links children to parents; orphans (missing parent) become roots.
- Cycle in `parentThreadId` does not hang and yields the cycle members as
  roots.
- Hidden and archived threads are excluded from the index (caller passes the
  already-filtered visible set; a test pins that hidden children don't nest).

Attention grouping placement:
- Needs-you child under Working parent → promoted to `attention` column,
  absent from the parent's nest.
- Unread child under Working parent → promoted to `unread`.
- Working child under Idle parent → promoted to `working`.
- Idle child under any parent → nests.
- Needs-you child under Needs-you parent → nests (equal rank).
- Live child under Done parent → promoted (any state outranks done).
- Column ordering of a promoted child inside its column follows the existing
  `sorted()` order.

Axis groupings:
- Project grouping: same-project child nests; cross-project child stands
  alone in its own project column.
- Machine and Provider groupings behave by the same key-match rule.
- Recency and None groupings: family nests regardless of differing buckets.

Depth:
- Grandchildren do not render as cards; the level-1 child carries
  `+N more` with the correct count.
- A level-1 child with no grandchildren renders no chip.

Filtering:
- State filter matching only a child keeps the family; parent is dimmed,
  child is not.
- Filter matching nothing in a family drops the whole family.
- Search hit on a child keeps the family (parent dimmed).
- Family-aware filtering composes with project/provider filters.

Column accounting:
- Column header count excludes nested children; a parent with N nested
  children counts once.
- Done-column membership of a done parent unaffected by nesting.

Typecheck gate: `npx tsc --noEmit` must pass alongside `npm test`.

## Pre-test inventory (coverage matrix rows added)

| Workflow path | Blast radius | Happy | Sad | Edge | Corner |
|---------------|--------------|-------|-----|------|--------|
| Family index (`buildFamilyIndex`) | low | auto (`tests/nesting.test.ts`) | auto (orphan → root) | auto (hidden/archived excluded) | auto (cycle tolerated) |
| Nesting placement, Attention grouping (`nestUnderParents`) | low | auto | auto (equal-rank child nests) | auto (done parent, live child promotes) | auto (promoted child keeps column sort) |
| Nesting placement, axis groupings | low | auto (same-axis nests) | auto (cross-axis child standalone) | auto (recency/none always nest) | skip (pure placement) |
| Depth cap (two levels, `+N more`) | low | auto | auto (no chip when no grandchildren) | auto (count correct) | skip |
| Family-aware filter + search | low | auto (child match keeps family) | auto (no match drops family) | auto (non-matching members dimmed) | auto (promotion applied after filtering) |

## Acceptance criteria

1. A parent thread with live children renders those children indented beneath
   its card, collapsible, visually subordinate, in every grouping.
2. In Attention grouping a Needs-you (and higher-precedence-than-parent
   Unread/Working) child stands alone in its state column — never buried.
3. Cross-project/machine/provider children under those groupings render as
   standalone cards in their own axis column, with their project mark.
4. Depth is capped at two levels; deeper descendants read `+N more` and open
   the pane.
5. A filter or search matching only a child surfaces the whole family with
   non-matching members dimmed.
6. Hidden children never render (board aligned with the sidebar's exclusion).
7. Column header counts exclude nested children.
8. `npm test` and `npx tsc --noEmit` pass.
## Amendments

- 2026-09-25 (code review finding 5): the `+N more` chip is **per-child**, as
  decision 3 reads, not an aggregate at the end of the child list as "What
  ships" wording suggested. Each level-1 child row with grandchildren shows
  its own inline `+N` chip (N = `grandchildCountFor(child, …)`), and clicking
  it opens that child's pane. The end-of-list aggregate chip is removed.
