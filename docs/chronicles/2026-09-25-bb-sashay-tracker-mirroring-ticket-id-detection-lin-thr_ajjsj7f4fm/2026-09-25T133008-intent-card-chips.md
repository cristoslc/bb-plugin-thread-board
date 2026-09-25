---
type: intent
timestamp: 2026-09-25T133008
responding-to: nothing (intent post for next work unit)
---

## Intent: card chips + link-out wiring

**Responding to:** nothing (intent post for next work unit)

**What:** render detected refs as small chips on cards (title line + branch
line scan), stop propagation on chip click, open href in a new tab; inert
chips when no href. Wire `repoHrefBase` from `sdk.projects.list()`
(`gitRemoteUrl` → `https://github.com/owner/repo`) in `app.tsx`, passed
down `Board → ThreadCard` like `projectNameFor`.

**Why:** phase 1's user-visible half — detection alone changes nothing on
screen.

**Success:** cards with `#N`/`PROJ-123` in title or branch show chips;
clicking a `#N` chip on a GitHub-remote project opens GitHub; no ref → no
chip, board unchanged; typecheck + suite green.

**Commits in this unit:** none yet
