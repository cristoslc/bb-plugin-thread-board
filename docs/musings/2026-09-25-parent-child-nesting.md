# Musing: Parent-child threads on the board

*2026-09-25 · sidequest · origin: the operator asked whether bb has thread parenting and whether the board could render parent-child threads as nested cards, the way Jira renders subissues*

## Does bb have a thread-parent relationship?

Yes, natively. `bb guide` documents it: threads can have a parent-child
relationship; the parent coordinates the child and receives lifecycle
notifications when the child completes, fails, or is interrupted. Threads
without a parent are managed directly by the operator.

And the plugin SDK exposes it on the surface the board already reads:
`parentThreadId: z.ZodNullable<z.ZodString>` sits on the live sidebar thread
schema (`bb-plugin-sdk-app.d.ts`), alongside `lifecycleOwnerThreadId` and
`originKind`/`originPluginId`. There is also a `parent-changed` event, so
re-parenting is observable in real time, not just a load-time fact.

The board is already consuming this stream (`experimental_useSidebarThreads`)
— parenting arrives for free; no new SDK surface, no server route.

## What the board could do with it

**Nested cards, Jira-subissue style.** A card whose thread has live children
renders its children inside or beneath it — indented, visually subordinate,
collapsible. Children live on the parent's card rather than as independent
columns entries, which matches the mental model: a parent thread is a unit of
work; its children are its parts.

### Design questions the implementation must answer

- **Which columns do children appear in?** A parent may be Working while a
  child is Needs you. If children nest under the parent, the Attention view
  loses the child's independent state — a Needs-you child buried under a
  Working parent is invisible in the column sweep. Candidate rule: children
  render under the parent *unless* the child's own state outranks the
  parent's (Needs you / Unread), in which case the child also — or instead —
  stands alone in its state's column. Deck's principle applies: "Needs you"
  is the only state that costs something to miss; never let nesting hide it.
- **Cross-project children.** `bb thread spawn --parent-thread` allows a
  parent in another project. A child whose project differs from its parent's
  cannot silently ride the parent's card in a project grouping. Lean: show
  the child with its project mark, or fall back to flat rendering when the
  board is grouped by Project.
- **Depth.** Threads can nest (parents of parents). Cap rendered depth
  (two levels, like Jira's subissues) and flatten deeper levels into a count
  ("+3 more"), or render fully but with bounded indentation. Lean: two
  levels, count beyond.
- **Interaction with the sweep.** An armed sweep must not archive a parent
  whose children are live, and should either skip children of an archived
  parent or archive the whole family together. The sweep musing's
  frozen-list rule makes this decidable: eligibility computed at arm time
  from family state, not per-card.
- **Filters.** A state filter that matches only a child should surface the
  family (parent dimmed, child highlighted) or surface the child alone?
  Candidate: match the family, dim the parent, so the child is never orphaned
  from its context.
- **What nesting means in non-Attention groupings.** In Project grouping the
  family probably stays together (they usually share a project); in Machine
  grouping a child may run elsewhere — same fallback question as
  cross-project.

## Prior art on this board

The three sashays already spawned (sweep, CLI, tracker mirroring) do not
touch nesting; this is independent of them. It intersects the sweep only at
the family-eligibility rule above — worth a cross-reference in the sweep's
plan when that lands.

## Open questions

- Does the live sidebar view include *hidden* child threads (the ones
  bb hides from the sidebar)? If hidden children exist, does the board show
  them nested under the parent or stay aligned with the sidebar's exclusion?
- Can a child's column placement differ from its parent's without confusing
  the grouping axes (Attention vs Project vs Machine)?
- Does `lifecycleOwnerThreadId` matter for family teardown (archive parent →
  children follow?), or is it orthogonal to parenting?