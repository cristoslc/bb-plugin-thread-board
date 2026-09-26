---
type: intent
timestamp: 2026-09-25T134000
responding-to: nothing (intent post for the UI work unit)
---

## Intent: UI — sweep buttons, armed state, confirm archives

**Responding to:** nothing (intent post for next work unit).

Final implementation unit wires the board UI per the plan: sweep buttons in
the Done column header and the Awhile-ago bucket headers (Attention and
Last-activity groupings); arming highlights and gathers eligible cards at
the top of the column; the armed label reads `Sweep N → Archive` with the
frozen count; second click archives the captured list via bb's sidebar
archive action; click-away, Escape, and arming the other column disarm; the
keep flag rides the card menu; thresholds arrive via `sweep_config_get` on
load. Grouping gains `withSweepGather` (pure, tested) that moves armed
candidates above the rest while armed; `ThreadCard` gains a
`isSweepHighlighted` prop.

Success: `npm test` (grouping gather tests + existing suites) and
`npx tsc --noEmit` green; the board renders armed state with no runtime
errors in the screenshot harness.

**Commits in this unit:** none yet