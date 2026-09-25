---
type: review-response
timestamp: 2026-09-25T134709
responding-to: PR-level code review (six-lens, needs_changes)
---

## Code review findings: 3 high, 6 medium — fix round incoming

**Responding to:** PR-level code review (security/style/logic/docs/memory/
project-memory-conformance, six specialist subagents). Report:
docs/ai-code-reviews/code-review-2026-09-25T134707.md

Security passed clean. Actionable findings, deduped:

1. **HIGH — .git hrefs 404:** app.tsx re-implements GitHub remote parsing
   with a greedy regex; .git-suffixed remotes yield `owner/repo.git` bases
   and GitHub-404ing chip hrefs (reviewer verified live). The status-dot
   path strips .git via resolveRepoSlug, so dots work while links die.
   Fix: use resolveRepoSlug + rebuild base from slug; add a .git test.
2. **HIGH — better-sqlite3 is a devDependency** while imported by shipped
   server runtime. Fix: move to dependencies.
3. **MEDIUM batch:** 500-cap silent drop (slice client-side), one-shot
   projects fetch never retried (re-run on projects prop change), bare
   catch hides bugs (log unexpected errors), unused `repo` prop on
   TicketChip, missing trailing newlines, two inaccurate KEY_REF comments.

Lows will ride along where free (type-only imports, lookbehind HASH_REF,
prune ticketStatuses per snapshot, plan/README notes).

**Commits in this unit:** 9e2e565 (review report)
