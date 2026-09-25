# Retro: Parent-child thread nesting (nested cards)

*2026-09-25 · sashay thr_aap36j6yz4 · PR #3 · squash-merged 305e4d9*

## What shipped

Jira-subissue-style nested cards on the board. bb's native parent-child
threads (`parentThreadId` on the sidebar stream + `parent-changed` event)
render as children indented under parent cards: collapsible chevron, per-child
state dots, child rows open their own panes, +N chip for grandchildren beyond
the 2-level cap. Family-aware filtering keeps a family together when any
member matches, dimming non-matching members.

## Decisions worth keeping

- **Promotion rule beats pure nesting.** A child whose state column strictly
  precedes its parent's (Attention grouping) stands alone — "never bury a
  Needs-you child" held as the one hard rule from the musing, and it forced
  the chip-count/row-placement split: chips count ALL visible children from
  the raw family index; rows come from the nesting map. Two views of one
  index (`assembleBoard()`), not two indexes.
- **Axis-match rule** for project/provider/machine grouping: children nest
  only when their axis key matches the parent's; otherwise they stay flat.
  Recency/None always nest.
- **Defensive family index**: orphans → roots, self-parents skipped, corrupt
  cycles unlinked. The board cannot hang on malformed `parentThreadId` data.

## Friction (the merge-time record)

- Review loop 1 caught the real blocker: duplicated promoted/cross-axis
  children because app.tsx read the raw family index instead of the nesting
  map. Fix restructured composition, not just the call site.
- No merge-time friction: branch was already rebased on origin/main, merge
  state CLEAN, 61/61 green pre-merge, squash merge clean on first try.
  Remote branch deletion by `gh --delete-branch` had already pruned origin;
  a local stale ref needed one `git fetch --prune`.

## Retro notes

- The musing's open questions (hidden-thread alignment, sweep family
  contract, cross-project children) were all answered in-plan; none deferred
  to this retro except: the sweep family-interaction rule ("thread with live
  children is never sweep-eligible") is recorded in the plan but NOT yet
  coded — the sweep sashay (PR #1, rebasing next) inherits it.
- Worktree and branches cleaned up; plan retained under docs/plans/ pending
  artifact-cleanup criteria.
