# Plan: Tracker mirroring — ticket-ID detection + link-out (step one)

*Source: docs/musings/2026-09-25-tracker-integration.md (decisions there are settled; "Mirror, don't integrate" is the chosen direction). The full adapter layer is explicitly out of scope for this sashay.*

*Status (end-of-sashay): both phases shipped on branch
`bb/sashay-tracker-mirroring-ticket-id-detection-lin-thr_ajjsj7f4fm`.
Empirical finding that reshaped phase 2: the GitHub plugin exposes no RPC
methods, so status reads its local SQLite cache server-side instead of
`callRpc` (details below, kept as written at plan time). Shipped contract
differs from the sketch below: input is `{ repo, numbers }` (not
`{ repo, refs }`) and statuses carry `{ kind, state }` only (no
title/updatedAt — the UI only needed the state dot).*

## Goal

Cards on the board show the ticket references they carry, and clicking a
reference opens the tracker. This is the pure, zero-credential half of the
"mirror, don't integrate" lean. A second phase adds live GitHub status for
cards whose title/branch carries a reference, and it lands only if phase one
is clean.

## Non-goals

- No Linear/Jira support (their credentials were never offered; the musing
  records this).
- No adapter layer, no per-project source selection, no "Work" column.
- No writes to any tracker — detection is read-only.

## Phase 1: ticket-ID detection + link-out

### Pattern set (answers musing open question #2)

Recognize exactly three shapes, all unambiguous in a title/branch context:

1. `PROJ-123` — uppercase key + digits (Jira/Linear/Backlog.md style).
   This is the primary shape; the regex is tolerant of multi-letter keys
   and of hyphens in the middle of prose but requires a word boundary
   before the key and after the number.
2. `#1234` — hash + digits (GitHub issue/PR shorthand). Requires a digit
   at least one long, and must NOT match `#0`-style degenerate values
   (single `0` is fine actually — real repos have issue #0? No: GitHub
   numbers start at 1. Guard: reject `#0`).
3. Full GitHub URLs (`https://github.com/owner/repo/issues/123`,
   `.../pull/45`) — appear when threads link issues directly.

### False-positive guarding (answers musing open question #2b)

- `PROJ-123` requires `[A-Z][A-Z0-9]+` before the hyphen (2+ chars, at
  least one letter), so `v1.2.3`, `2026-09-25`, `e2e-4`, and lone `x-1`
  do not match. A leading word boundary `\b` keeps `XABC-1` from matching
  inside `PROJ-XABC-1`'s tail — the match anchors to the *start* of the
  token.
- `#1234` requires the hash to be preceded by start/string boundary or
  whitespace/punctuation (not another word char), so `abc#12` does not
  match, and `#` followed by non-digits does not match.
- Dates like `2026-09-25` cannot match because the digit-leading rule
  demands the token start on a letter; `2026` has no uppercase-letter
  prefix.
- Hex hashes in branch names (`a1b2c3`) don't match: no hyphen, no `#`.

### Pure module: `lib/tickets.ts`

```ts
export interface TicketRef {
  /** The matched text, e.g. "PROJ-123", "#482". */
  raw: string;
  /** Tracker kind, e.g. "generic" | "github". */
  tracker: "generic" | "github";
  /** Issue/PR number when the ref is numeric (#123 / URL forms). */
  number?: number;
  /** Project key for PROJ-123 style refs, e.g. "PROJ". */
  key?: string;
  /** Direct href when resolvable (GitHub URL refs, or repo-scoped #N). */
  href?: string;
}
export function findTicketRefs(title: string, opts?: { repoHrefBase?: string }): TicketRef[];
```

- `repoHrefBase` is the project's GitHub base URL
  (`https://github.com/owner/repo`) when known; `#N` refs get
  `{base}/issues/N` hrefs and GitHub URL refs keep their own URL as href.
- Extraction is pure string work + one regex pass per shape; fully
  unit-testable, zero credentials, zero SDK surface.

### Where detection plugs in

`components/thread-card.tsx` already renders `thread.displayTitle` and the
branch line. Detection runs over **both** the title and the branch name
(`thread.environment?.branchName ?? thread.host?.name ?? ""`); refs are
deduped by `raw`. Rendering: each ref becomes a small chip/button rendered
*after* the title line, styled as a muted badge. Clicking stops propagation
(the card itself is an `<a>` to the thread) and opens the ref href in a new
tab via `window.open(href, "_blank")`. Refs without a resolvable href
(`PROJ-123` with no repo mapping) render as chips without links —
detection still visible, link-out degraded, never broken.

### Resolving the repo for link-out

`app.tsx` already holds `sdk`; `sdk.projects.list()` returns
`ProjectResponse[]` including `gitRemoteUrl`. Board derives a
`repoBaseFor: (projectId) => string | null` map once per project list
(parse `git.owner/repo` from an `https://github.com/...` remote; other
hosts → null). Passed down `Board → ThreadCard` like `projectNameFor`.

## Phase 2: live GitHub status (only if phase 1 lands cleanly)

### Empirical answer to musing open question #1 (polling cost)

The official GitHub plugin (builtin, v0.2.1, running) publishes **no
discoverable RPC methods** — `bb plugin rpc list github` returns none, and
`bb plugin rpc call github sync` 404s. The musing's proposed vehicle
(`bb.sdk.plugins.callRpc`) therefore has no method to call today. What the
plugin does maintain is a **local SQLite cache** at
`~/.bb/plugins/github/data.db` with an `items` table keyed
`(repo, kind, number)` carrying `state`, `title`, `updatedAt` — populated
by the plugin's `sync` service. `bb github issues/prs` read exactly this
cache.

Plan pivot: phase 2 reads that cache **server-side** from the thread-board
plugin, keyed by `(repo, number, kind)`:

- The board's `server.ts` gains a `tracker_status` RPC:
  - input: `{ repo: string, refs: number[] }`
  - output: `{ statuses: Record<number, { kind, state, title?, updatedAt? }> }`
- Implementation opens the GitHub plugin's SQLite cache read-only
  (better-sqlite3 is already a dependency), queries `items` for the
  given repo+numbers, and returns what it finds. Missing rows → absent
  keys (card shows nothing extra). No cache/db → empty map. **Degrades
  gracefully: never breaks the board.**
- Caveat recorded in code comment + chronicle: this reads another plugin's
  internal cache — an undocumented surface. If the GitHub plugin later
  publishes real RPC, this should switch to it (the musing's original
  intent). The failure mode if the file moves/changes schema is an empty
  status map, not a crash.

### Polling-cost answer (musing open question #1, second half)

No polling: statuses are fetched **once per board render** for the set of
refs actually visible (one RPC per visible-ref batch, on
`thread-list-changed` realtime nudges the board already reacts to), not per
card, not on an interval. The GitHub plugin's own `sync` service refreshes
the cache; the board only reads it.

## Cards with status

Card badge per ref with a state dot + number (`#1234` open/closed/merged),
reusing the existing state-dot color language (`OPEN` → emerald, `CLOSED`
issue → muted, `MERGED`/closed PR → purple, unknown → gray). `PROJ-123`
style refs stay plain chips (no GitHub meaning).

## Test plan (vitest, tests/ alongside tests/grouping.test.ts)

- `tests/tickets.test.ts`: pattern acceptance, false-positive guards,
  dedup, href resolution with/without repo base, URL forms.
- `tests/tracker-status.test.ts`: server handler with a temp SQLite
  fixture (create schema matching `items`), absent-DB → empty map,
  partial matches.
- `npm test` + `npx tsc --noEmit` must pass (both commands already
  declared in package.json).

## Test command

- `npm test` (vitest run) — declared in package.json.
- `npx tsc --noEmit` — declared as `npm run typecheck`.

## Acceptance

1. Cards whose title/branch carry `PROJ-123` / `#1284` / GitHub URLs show
   ticket chips.
2. Clicking a `#N` chip on a project with a GitHub remote opens the issue
   on GitHub; with no remote, the chip renders inert (no link).
3. With the GitHub plugin cache present, matching `#N` chips show a live
   state dot; without it, chips render without status and the board is
   unaffected.
4. Full suite + typecheck pass.