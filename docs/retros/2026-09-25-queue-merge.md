# Retro: Four-PR queue merge (0.2.0)

*2026-09-25 · sashays thr_5vy3e4spp2, thr_x7zz4eabg2, thr_ajjsj7f4fm, thr_aap36j6yz4 · PRs #4 → #1 → #2 → #5 · merged 49ce914, ad27526, 4eedb00, 78a5513*

## The merge order paid off

Merging the done-metadata foundation (#4) first forced every later rebase to
adopt metadata Done in one pass. Each subsequent branch rebased cleanly onto
the accumulating main in its own worktree, one conflict class at a time:

- **#1 sweep** (rebasing onto #4): server.ts took main's metadata store
  wholesale; sweep-only RPC contracts (sweep_config_get, sweep_keep_set),
  settings, and the epoch-ms adapter re-added on top. The KV-based Done store
  was deleted, not merged — dead on arrival post-#4. The keep store stayed
  KV (`sweep-keep-flags`) because idle-arm keep applies to threads never
  marked Done; keep flags now merge into done_list's records for the client.
- **#2 tracker** (rebasing onto #1's nesting+sweep spills): thread-card.tsx
  was the battleground — three features touching one card. Final shape: main
  card structure + tracker's ticket machinery grafted (STATUS_DOT_CLASS,
  status-aware TicketChip, resolveRepoSlug), chips row inside the anchor.
- **#5 nesting refinements**: trivial by comparison; imports + README merged,
  rebase onto sweep-shifted `localStorage` defaults green.

## Friction that actually cost time

1. **GitHub mergeable UNKNOWN**: after force-pushes, the API reported null
   for ~2min (harmless lag); waiting on fresh `gh pr checks` saved the logic.
2. **WIP: leaked into a squash title** (#5): `gh pr edit --remove-draft` is
   not a thing; `gh pr ready` did it, then the merge carried the stale "WIP:"
   prefix into the commit. Fixed title post-hoc via API. Lesson: drop the
   prefix from the branch's last chronicle entry too, not only the PR state.
3. **Rebase vs hand-merge**: for the two server.ts/card.tsx collisions that
   git couldn't orthogonalize, hand-splicing main + branch pieces beat odds-
   and-ends conflict markers — but each hand-merge ate a test run to prove.

## Retro notes

- Ship rule confirmed again: one PR per feature, rebases at merge time, one
  version bump + CHANGELOG at the end of a batch. 0.2.0 released with all
  five features and the read-path contract changes recorded.
- The kept-flags-in-KV + metadata-Done split may want a unifying pass once
  the CLI lands (its plan inherits import-first ordering); flagged, not
  scheduled.
