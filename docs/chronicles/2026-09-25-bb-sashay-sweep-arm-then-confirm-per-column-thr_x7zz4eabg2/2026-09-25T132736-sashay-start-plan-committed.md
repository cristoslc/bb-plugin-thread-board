---
type: intent
timestamp: 2026-09-25T132736
responding-to: nothing (sashay start; operator request to implement the sweep per docs/musings/2026-09-25-sweep.md)
---

## Sashay start: plan committed, chronicle initialized

**Responding to:** nothing (sashay start — per operator request: implement
the sweep feature per the musing).

Plan written to
[docs/plans/bb-sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2.md](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2/docs/plans/bb-sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2.md)
and committed to trunk (eaee571), cherry-picked after it first landed on the
sashay branch by mistake. Same commit added the project's `## Test command`
(`npm test`) declaration and the master coverage matrix
([docs/test-coverage-matrix.md](https://github.com/cristoslc/bb-plugin-thread-board/blob/bb/sashay-sweep-arm-then-confirm-per-column-thr_x7zz4eabg2/docs/test-coverage-matrix.md)),
which were missing from the repo and would have failed closure step 7.

Key plan decisions captured (from the musing, settled): per-column
arm-then-confirm buttons for Done and Awhile-ago; frozen explicit list at
arm time (count freezes with it); `doneArchiveDays` default 7; proposed
`idleArchiveDays` default 30 for the idle arm with rationale; keep-flag
override honored by both arms. Open interface decision resolved in the plan:
the done-state sashay (thr_ev3ctjagqt) has not landed, so sweep reads Done
ages through a `DoneAgeSource` interface implemented over the existing KV
store with first-seen stamps; undated (pre-existing) done threads are never
eligible — no guessing at ages.

**Commits in this unit:** eaee571