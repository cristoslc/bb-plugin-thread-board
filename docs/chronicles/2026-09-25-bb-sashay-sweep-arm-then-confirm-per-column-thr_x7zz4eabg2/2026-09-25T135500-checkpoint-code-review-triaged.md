---
type: checkpoint
timestamp: 2026-09-25T135500
responding-to: code-review findings (step 8 of the closure loop)
---

## Checkpoint: code review complete — cross-sashay contamination filtered; findings triaged

**Responding to:** code review findings (closure step 8).

Dispatched the code-review skill in specialist mode (6 lenses) against
`origin/main...HEAD`. Contamination: the docs, memory, and
project-memory-conformance agents reviewed the *tracker-mirroring sashay's*
diff (PR #2, sibling thread) instead of mine — its commits mention
`lib/tickets.ts` files that do not exist on my branch. I verified with
`git diff origin/main...HEAD --name-only` that my branch contains no
tracker/tickets files, and discarded those agents' findings as off-branch.
Their valid-sounding findings were evaluated against the wrong codebase.

Valid findings from the security and logic/style agents, triaged:

1. **HIGH — frozen-list mismatch at confirm (board.tsx/app.tsx):** confirm
   archives the frozen arm-time list while the button count/gather/highlight
   show the *live* recomputed eligible set; a thread pulled out of Done
   mid-arm still gets archived. Fix: pass the frozen list to Board and use
   it for count, gather, and highlight while armed.
2. **HIGH — keep flag only applies to Done threads but the idle arm honors
   `kept`:** sweep_keep_set throws for non-Done threads, so an idle thread's
   keep can never persist. Design question: the musing says the override
   "applies to those too" (long-idle cards). Fix: store keep records
   independently of Done marks (separate KV map) so both arms read one
   override store; drop the throw.
3. **MED — archive side effects inside a setState updater:** move the
   archive loop out of the updater; guard via the current armed state.
4. **MED — armed column with zero live eligible count loses its button:**
   derive isArmed from the armed column alone and show the frozen count.
5. **MED — isDoneStore disjunction hole:** validate each key independently,
   reject unknown keys.
6. **LOW — corrupt store silently resets to {} then persists the wipe:**
   log a warning, return {} but do not silently overwrite without signal
   (fail loud in the log).
7. **LOW — vacuous rejection test (sweep-rpc.test.ts line 15):** real bug in
   my test — it references an undefined identifier inside expect().toThrow
   so it passes on ReferenceError. Fix to use rpcContract and assert
   ZodError.
8. **LOW — dupes/dead code:** threshold constants duplicated server/lib;
   column-classification magic strings in three places; ArmedSweep dead
   fields; confirmSweep parameter semantics; duplicated test factory;
   done_set no-op write; redundant optional guards.

All are actionable; dispatching the fix unit next (RGR where a failing test
can lead: items 3, 4, 5, 6, 7, 8 partially).

**Commits in this unit:** none yet (review only)