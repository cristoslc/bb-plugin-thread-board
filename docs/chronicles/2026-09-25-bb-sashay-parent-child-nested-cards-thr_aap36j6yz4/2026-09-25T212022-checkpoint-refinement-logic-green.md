---
type: checkpoint
timestamp: 2026-09-25T212022
responding-to: 2026-09-25T210959-intent-refinement-round-2.md
---

## Checkpoint: refinement logic layer green (R2 + R3)

Work unit A closed. Tests were written red first (13 failing across
`tests/nesting.test.ts` and `tests/preferences.test.ts`), then the logic
landed:

- `components/nesting.ts`:
  - `assembleBoard`/`nestUnderParents` gain a `NestingOptions` argument
    (`nestingEnabled`, default true). OFF → fully flat board: columns built
    from non-archived threads only, empty nest/chip maps out.
  - Archived children never take standalone column slots: `assembleBoard`
    excludes archived threads from column building in both modes; archived
    children always nest (archived overrides promotion and axis-match in
    `childNests`).
  - `threadPassesFilter` extracted as the shared per-thread predicate;
    archived threads never pass it. `filterFamilies` uses it (archived
    members ride along, dimmed, never contribute a match);
    `filterIndividually` (new) is the flat-mode per-thread filter.
  - Chip counts include archived children (raw family index is archived
    inclusive).
- `components/preferences.ts` (new, pure): `NEST_CHILDREN_KEY`,
  `parseNestStored` (anything but "off" defaults ON), `nestStoredValue`.

`npm test`: 82 passed (3 files) · `npx tsc --noEmit`: clean. UI wiring
(ChildRow fat rows + archived treatment, toolbar toggle, app.tsx pipeline)
is the next unit.

**Commits in this unit:** logic layer (nesting.ts + preferences.ts + tests)