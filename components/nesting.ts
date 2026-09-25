import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type {
  BoardColumn,
  FilterState,
  GroupBy,
  GroupingContext,
  ThreadState,
} from "./grouping";
import {
  STATUS_COLUMN_ORDER,
  columnFor,
  matchesFilter,
  threadState,
} from "./grouping";

export interface FamilyIndex {
  /** Parent id → its visible children, in input order. */
  childrenByParent: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  /** Child id → its parent's id; absent for roots (including cycle members and orphans). */
  parentOf: ReadonlyMap<string, string>;
  /** Visible threads that are not nested under any parent, in input order. */
  rootIds: ReadonlySet<string>;
}

export interface NestingResult {
  columns: BoardColumn[];
  /** Parent id → the live children that render nested under its card. */
  childrenByParent: ReadonlyMap<string, readonly PluginSidebarThread[]>;
}

export interface FamilyFilterResult {
  kept: PluginSidebarThread[];
  /** Members of kept families that do not themselves match the filters. */
  dimmedIds: ReadonlySet<string>;
}

/**
 * Build parent→children / child→parent maps from the visible thread set.
 * The caller passes the already-filtered visible set (hidden and archived
 * threads are excluded by app.tsx before this runs), so hidden children never
 * nest. A `parentThreadId` that points at a thread not in the set (archived,
 * deleted) leaves the child a root — flat fallback. Corrupt parent cycles are
 * treated as roots: cycle members keep their cards instead of hanging the
 * board.
 */
export function buildFamilyIndex(threads: readonly PluginSidebarThread[]): FamilyIndex {
  const present = new Set(threads.map((thread) => thread.id));
  const parentOf = new Map<string, string>();

  for (const thread of threads) {
    const parentId = thread.parentThreadId;
    if (parentId === null || parentId === "" || !present.has(parentId)) continue;
    if (parentId === thread.id) continue; // self-parent is corrupt data
    parentOf.set(thread.id, parentId);
  }

  // Defensive cycle pass: a corrupt `parentThreadId` cycle must not hang the
  // board. Detect every member whose parent chain closes back on itself
  // (before any unlinking, so detection is order-independent), then unlink
  // them all so each renders as a root.
  const cyclic = new Set<string>();
  for (const thread of threads) {
    const start = thread.id;
    const walk = new Set<string>([start]);
    let cursor = parentOf.get(start);
    while (cursor !== undefined) {
      if (cursor === start) {
        cyclic.add(start);
        break;
      }
      if (walk.has(cursor)) break; // joins another walk's cycle; it handles itself
      walk.add(cursor);
      cursor = parentOf.get(cursor);
    }
  }
  for (const id of cyclic) parentOf.delete(id);

  const childrenByParent = new Map<string, PluginSidebarThread[]>();
  for (const thread of threads) {
    const parentId = parentOf.get(thread.id);
    if (parentId === undefined) continue;
    const siblings = childrenByParent.get(parentId);
    if (siblings === undefined) childrenByParent.set(parentId, [thread]);
    else siblings.push(thread);
  }

  const rootIds = new Set(
    threads.filter((thread) => !parentOf.has(thread.id)).map((thread) => thread.id),
  );
  return { childrenByParent, parentOf, rootIds };
}

/**
 * Does a child stay under its parent in this grouping? Returns `true` to
 * nest, `false` to keep the child flat.
 *
 * - Promotion (Attention grouping): a child whose state column strictly
 *   precedes its parent's stands alone in its own state column — never bury
 *   a Needs-you child. Done is the rightmost lane, so any live child of a
 *   Done parent promotes. Equal rank nests.
 * - Axis match (project/provider/machine): the child nests only when its
 *   axis key matches its parent's; otherwise it stays flat in its own axis
 *   column.
 * - Recency / None: columns are per-thread presentation, not grouping
 *   boundaries — always nest.
 */
function childNests(
  child: PluginSidebarThread,
  parent: PluginSidebarThread,
  groupBy: GroupBy,
  now: number,
): boolean {
  if (groupBy === "status") {
    return stateRank(threadState(child)) >= stateRank(threadState(parent));
  }
  if (groupBy === "project" || groupBy === "provider") {
    const key = groupBy === "project" ? child.projectId : child.providerId;
    const parentKey = groupBy === "project" ? parent.projectId : parent.providerId;
    return key === parentKey;
  }
  if (groupBy === "machine") {
    return (child.host?.id ?? "none") === (parent.host?.id ?? "none");
  }
  return true; // recency / none
}

function stateRank(state: ThreadState): number {
  const index = STATUS_COLUMN_ORDER.indexOf(state);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/**
 * Pull nested children out of their column placement and attach them under
 * their parent's card. Applies two rules:
 *
 * - Promotion (Attention grouping): a child whose state column precedes its
 *   parent's stands alone in its own state column — never bury a Needs-you
 *   child. Done is the rightmost lane, so any live child of a Done parent
 *   promotes.
 * - Axis match (project/provider/machine): a child nests only when its axis
 *   key matches its parent's; otherwise it stays flat in its own column.
 *   Recency and None groupings always nest.
 *
 * `childrenByParent` holds each parent's nested children in the same sorted
 * order the columns use (pinned-first, newest-first). Grandchildren are
 * never placed: a child that itself has children surfaces them only through
 * the `+N more` count (`grandchildCountFor`).
 */
export function nestUnderParents(
  columns: readonly BoardColumn[],
  threads: readonly PluginSidebarThread[],
  groupBy: GroupBy,
  context: GroupingContext,
  now: number = Date.now(),
): NestingResult {
  const index = buildFamilyIndex(threads);
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));

  // Decide, per child, nest vs. flat. Promoted/flat children keep their
  // column placement; nested children are removed from columns.
  const nested = new Map<string, PluginSidebarThread[]>();
  const flatIds = new Set<string>();
  for (const [childId, parentId] of index.parentOf) {
    const child = threadById.get(childId);
    const parent = threadById.get(parentId);
    if (child === undefined || parent === undefined) {
      flatIds.add(childId);
      continue;
    }
    if (childNests(child, parent, groupBy, now)) {
      const siblings = nested.get(parentId);
      if (siblings === undefined) nested.set(parentId, [child]);
      else siblings.push(child);
    } else {
      flatIds.add(childId);
    }
  }

  // A parent whose children all nest keeps its card; children leave the
  // column lists entirely. Only roots (and promoted/flat children) stay.
  const outColumns: BoardColumn[] = columns.map((column) => {
    const kept = column.threads.filter(
      (thread) => !nestedKeys(nested).has(thread.id) && (flatIds.has(thread.id) || index.rootIds.has(thread.id)),
    );
    return { ...column, threads: kept };
  });

  return { columns: outColumns, childrenByParent: nested };
}

function nestedKeys(nested: ReadonlyMap<string, readonly PluginSidebarThread[]>): Set<string> {
  const ids = new Set<string>();
  for (const children of nested.values()) {
    for (const child of children) ids.add(child.id);
  }
  return ids;
}

/**
 * The `+N more` number for a level-1 child: how many visible grandchildren it
 * has, i.e. the size of the child's own nested-children entry. Zero means no
 * chip. (The parent card's own entry counts its level-1 children, not
 * grandchildren.)
 */
export function grandchildCountFor(
  child: PluginSidebarThread,
  childrenByParent: ReadonlyMap<string, readonly PluginSidebarThread[]>,
): number {
  return childrenByParent.get(child.id)?.length ?? 0;
}

/**
 * Family-aware filtering: a family passes when ANY of its visible members
 * passes the filters or search; every visible member of a passing family is
 * kept, with non-matching members recorded in `dimmedIds` so the board can
 * render them at reduced opacity. A family where nothing matches is dropped
 * whole.
 */
export function filterFamilies(
  threads: readonly PluginSidebarThread[],
  familyIndex: FamilyIndex,
  filter: FilterState,
  searchQuery: string,
): FamilyFilterResult {
  const passes = (thread: PluginSidebarThread): boolean => {
    if (filter.projects.size > 0 && !filter.projects.has(thread.projectId)) return false;
    if (filter.providers.size > 0 && !filter.providers.has(thread.providerId)) return false;
    if (filter.states.size > 0 && !filter.states.has(threadState(thread))) return false;
    if (searchQuery.trim() !== "" && !matchesFilter(thread, searchQuery.trim())) return false;
    return true;
  };

  // Group visible threads into families by their root, so a parent and its
  // descendants pass or fail together.
  const families = new Map<string, PluginSidebarThread[]>();
  for (const thread of threads) {
    let rootId = thread.id;
    let cursor = familyIndex.parentOf.get(thread.id);
    const seen = new Set<string>();
    while (cursor !== undefined && !seen.has(cursor)) {
      seen.add(cursor);
      rootId = cursor;
      cursor = familyIndex.parentOf.get(cursor);
    }
    const family = families.get(rootId);
    if (family === undefined) families.set(rootId, [thread]);
    else family.push(thread);
  }

  const kept: PluginSidebarThread[] = [];
  const dimmedIds = new Set<string>();
  for (const family of families.values()) {
    const matching = family.filter(passes);
    if (matching.length === 0) continue;
    for (const thread of family) {
      kept.push(thread);
      if (!matching.includes(thread)) dimmedIds.add(thread.id);
    }
  }
  return { kept, dimmedIds };
}