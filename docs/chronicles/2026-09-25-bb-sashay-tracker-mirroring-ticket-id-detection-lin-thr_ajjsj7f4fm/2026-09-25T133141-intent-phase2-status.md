---
type: intent
timestamp: 2026-09-25T133141
responding-to: nothing (intent post for phase 2)
---

## Intent: phase 2 — GitHub status from the plugin cache

**Responding to:** nothing (intent post for phase 2 work unit)

Phase 1 landed cleanly (detection green, chips wired, typecheck clean), so
phase 2 proceeds per the plan's gate.

**What:** server-side `tracker_status` RPC in `server.ts` that reads the
GitHub plugin's SQLite cache (`~/.bb/plugins/github/data.db`, `items`
table keyed `(repo, kind, number)` — schema verified live: columns
repo/kind/number/state/title/updated_at). Frontend batches visible
numeric refs per repo into one RPC call on board data changes; chips gain
a state dot. Absent DB, absent rows, or any error → empty/partial map,
never an error to the board.

**Why:** the musing's phase 2 (live status) with the only available
vehicle — the plugin exposes no RPC (verified empirically), so the cache
read is the graceful path.

**Success:** a card whose `#N` matches a cache row shows a state dot
(OPEN emerald / CLOSED muted / MERGED purple); without cache or match,
chips render as in phase 1; suite + typecheck green; new server tests
cover hit/miss/no-DB/partial.

**Commits in this unit:** none yet
