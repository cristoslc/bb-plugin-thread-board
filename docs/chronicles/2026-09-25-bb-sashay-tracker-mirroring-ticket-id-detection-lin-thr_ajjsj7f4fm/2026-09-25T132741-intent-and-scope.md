---
type: intent
timestamp: 2026-09-25T132741
responding-to: nothing (sashay kickoff)
---

## Sashay kickoff: tracker mirroring, step one

**Responding to:** nothing (sashay kickoff)

Per operator request: implement the "Mirror, don't integrate" lean from
docs/musings/2026-09-25-tracker-integration.md — ticket-ID detection on
cards, link-out on click, then (only if phase one is clean) live GitHub
status for cards whose title/branch carries a reference. No Linear/Jira,
no adapter layer.

**Intent for the next work unit:** implement the pure detection module
`lib/tickets.ts` with its test suite first (TDD), then wire chips into
the card.

Decisions already settled at plan time (docs/plans/2026-09-25-tracker-mirroring-ticket-id-detection-link-out.md):

- Pattern set: `PROJ-123`, `#1234`, full GitHub URLs; false-positive
  guards via word boundaries and the uppercase-key rule.
- The musing's proposed vehicle for live status (`bb.sdk.plugins.callRpc`)
  is empirically unavailable: the official GitHub plugin publishes no RPC
  methods (`bb plugin rpc list github` → none; `call github sync` → 404).
  Phase 2 pivots to reading the plugin's local SQLite cache server-side,
  with a graceful-degradation contract and a documented caveat that the
  cache is an internal surface.

**Commits in this unit:** 94464e5 (plan)