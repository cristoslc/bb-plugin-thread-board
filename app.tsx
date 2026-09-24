import { useCallback, useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  experimental_useProviders,
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreads,
  useBbNavigate,
  useRealtime,
  useRpc,
  useSdk,
} from "@get-bb/plugin-sdk/app";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";
import { Board } from "./components/board";
import { BoardToolbar } from "./components/board-toolbar";
import { ThreadPane } from "./components/thread-pane";
import type { ThreadPaneThread } from "./components/thread-pane";
import type { FilterState, GroupBy, ThreadState } from "./components/grouping";
import {
  buildColumns,
  columnFor,
  filterThreads,
  matchesFilter,
} from "./components/grouping";
import { EmptyState } from "./components/empty-state";

const GROUP_BY_KEY = "thread-board:groupBy";
const FILTER_KEY = "thread-board:filter";
const SEARCH_KEY = "thread-board:search";

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null && (allowed as readonly string[]).includes(value)) {
      return value as T;
    }
  } catch {
    // localStorage can throw in embedded contexts; fall through to default.
  }
  return fallback;
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Best effort only; the board still works without persistence.
  }
}

function readStoredList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === "string");
      }
    }
  } catch {
    // localStorage can throw in embedded contexts; fall through to default.
  }
  return [];
}

function BoardPage() {
  const { status, threads, projects, sections } = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const { providers } = experimental_useProviders();
  const navigate = useBbNavigate();
  const rpc = useRpc<typeof rpcContract>();
  const sdk = useSdk();

  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    rpc.call("done_list").then(
      (result) => setDoneIds(new Set(result.doneIds)),
      () => {}, // Done marking is optional state; the board works without it.
    );
  }, [rpc]);
  useRealtime("done-changed", () => {
    rpc.call("done_list").then(
      (result) => setDoneIds(new Set(result.doneIds)),
      () => {},
    );
  });

  // The sidebar view refreshes over its own realtime subscription, but
  // archive/unarchive changes also bump the pane's button state and the
  // archived lookup that keeps the pane usable after archiving. Only the
  // pane needs archived threads (the board hides them), so a minimal shape
  // from the SDK list is enough.
  const [archiveTick, setArchiveTick] = useState(0);
  const [archivedThreads, setArchivedThreads] = useState<
    readonly { id: string; title: string | null; titleFallback: string | null }[]
  >([]);
  useEffect(() => {
    const unsubscribe = sdk.subscribe({
      event: "thread:changed",
      callback: (event) => {
        if (event.entity === "thread" && event.changes.includes("archived-changed")) {
          setArchiveTick((tick) => tick + 1);
        }
      },
    });
    return unsubscribe;
  }, [sdk]);
  useEffect(() => {
    let cancelled = false;
    sdk.threads
      .list({ archived: true, limit: 200 })
      .then(
        (result) => {
          if (!cancelled) {
            setArchivedThreads(
              result.map((thread) => ({
                id: thread.id,
                title: thread.title,
                titleFallback: thread.titleFallback,
              })),
            );
          }
        },
        () => {}, // Archived lookup is best-effort; the board works without it.
      );
    return () => {
      cancelled = true;
    };
  }, [sdk, archiveTick]);

  const [groupBy, setGroupBy] = useState<GroupBy>(() =>
    readStored(GROUP_BY_KEY, ["none", "status", "recency", "project", "provider", "section", "environment"], "status"),
  );
  const [filter, setFilter] = useState<FilterState>(() => ({
    projects: new Set(readStoredList(`${FILTER_KEY}:projects`)),
    providers: new Set(readStoredList(`${FILTER_KEY}:providers`)),
    states: new Set(
      readStoredList(`${FILTER_KEY}:states`).filter((state): state is ThreadState =>
        (["working", "attention", "unread", "idle"] as const).includes(state as ThreadState),
      ),
    ),
  }));
  const [search, setSearch] = useState<string>(() => readStored(SEARCH_KEY, [], ""));
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  // The selected thread's column is captured when it is opened and held until
  // it is deselected, so live state/age changes cannot slide the card.
  const [frozenColumn, setFrozenColumn] = useState<{
    threadId: string;
    column: { id: string; label: string };
  } | null>(null);

  const persistGroupBy = useCallback((value: GroupBy) => {
    setGroupBy(value);
    writeStored(GROUP_BY_KEY, value);
  }, []);
  const persistFilter = useCallback((next: FilterState) => {
    setFilter(next);
    writeStored(`${FILTER_KEY}:projects`, JSON.stringify([...next.projects]));
    writeStored(`${FILTER_KEY}:providers`, JSON.stringify([...next.providers]));
    writeStored(`${FILTER_KEY}:states`, JSON.stringify([...next.states]));
  }, []);
  const persistSearch = useCallback((value: string) => {
    setSearch(value);
    writeStored(SEARCH_KEY, value);
  }, []);

  // The sidebar view pushes fresh thread data continuously; this signal
  // additionally fires on host-side changes so cards never sit stale.
  useRealtime("thread-list-changed", () => {});

  const visibleThreads = useMemo(
    () => threads.filter((thread) => !thread.isHidden && !thread.isArchived),
    [threads],
  );

  const filterOptions = useMemo(() => {
    const projectIds = new Set<string>();
    const providerIds = new Set<string>();
    for (const thread of visibleThreads) {
      projectIds.add(thread.projectId);
      providerIds.add(thread.providerId);
    }
    return { projectIds, providerIds };
  }, [visibleThreads]);

  const filtered = useMemo(
    () => filterThreads(visibleThreads, filter),
    [visibleThreads, filter],
  );

  const searchActive = search.trim() !== "";
  const searched = searchActive
    ? filtered.filter((thread) => matchesFilter(thread, search.trim()))
    : filtered;

  const columns = useMemo(() => {
    const frozen = new Map<string, { id: string; label: string }>();
    if (openThreadId !== null && frozenColumn !== null && frozenColumn.threadId === openThreadId) {
      frozen.set(frozenColumn.threadId, frozenColumn.column);
    }
    return buildColumns(searched, groupBy, { projects, sections, providers }, frozen, doneIds);
  }, [searched, groupBy, projects, sections, providers, openThreadId, frozenColumn, doneIds]);

  const anyFilterActive =
    filter.projects.size > 0 || filter.providers.size > 0 || filter.states.size > 0 || searchActive;
  const emptyBecauseFiltered = visibleThreads.length > 0 && searched.length === 0 && anyFilterActive;

  // The open pane's thread can vanish from the active view (archived,
  // deleted); the archived list keeps it resolvable so the pane stays open
  // with an Unarchive button. Only deletion closes the pane.
  // The open pane's thread can vanish from the active view (archived,
  // deleted); the archived list keeps it resolvable so the pane stays open
  // with an Unarchive button. Only deletion closes the pane.
  const openThreadActive = threads.find((thread) => thread.id === openThreadId) ?? null;
  const openThreadArchived =
    openThreadActive === null && openThreadId !== null
      ? (archivedThreads.find((thread) => thread.id === openThreadId) ?? null)
      : null;
  const openThread: ThreadPaneThread | null =
    openThreadActive !== null
      ? {
          id: openThreadActive.id,
          displayTitle: openThreadActive.displayTitle,
          status: openThreadActive.status,
          isUnread: openThreadActive.isUnread,
        }
      : openThreadArchived !== null
        ? {
            id: openThreadArchived.id,
            displayTitle:
              openThreadArchived.title ?? openThreadArchived.titleFallback ?? openThreadArchived.id,
            status: "idle",
            isUnread: false,
          }
        : null;

  const openThreadIsArchived =
    openThreadId === null
      ? false
      : (threads.some(
          (thread) => thread.id === openThreadId && !thread.isArchived,
        )
          ? false
          : archivedThreads.some((thread) => thread.id === openThreadId));

  const openThreadCard = useCallback(
    (threadId: string) => {
      setOpenThreadId(threadId);
      const thread = threads.find((candidate) => candidate.id === threadId);
      setFrozenColumn(
        thread === undefined
          ? null
          : {
              threadId,
              column: columnFor(thread, groupBy, { projects, sections, providers }),
            },
      );
    },
    [threads, groupBy, projects, sections, providers],
  );

  const closeThreadPane = useCallback(() => {
    setOpenThreadId(null);
    setFrozenColumn(null);
  }, []);

  // Project creation needs a host checkout path; the personal workspace's
  // host hosts every project, so create under the first known host.
  const createProject = useCallback(
    async (name: string) => {
      const hosts = await sdk.hosts.list();
      if (hosts.length === 0) {
        throw new Error("No connected host to create the project checkout on.");
      }
      const host = hosts.find((candidate) => candidate.lifecycle?.phase === "active") ?? hosts[0];
      await sdk.projects.create({
        name,
        source: {
          type: "local_path",
          hostId: host.id,
          path: `~/bb-projects/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        },
      });
    },
    [sdk],
  );

  if (status === "loading" && threads.length === 0) {
    return (
      <div className="p-4">
        <EmptyState>Loading threads…</EmptyState>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="p-4">
        <EmptyState>Could not load threads. Reload the panel to retry.</EmptyState>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <BoardToolbar
          groupBy={groupBy}
          onGroupByChange={persistGroupBy}
          filter={filter}
          onFilterChange={persistFilter}
          search={search}
          onSearchChange={persistSearch}
          projectIds={filterOptions.projectIds}
          providerIds={filterOptions.providerIds}
          projects={projects}
          providers={providers}
          onCreateProject={createProject}
          totalCount={searched.length}
          onClearFilters={() => {
            persistFilter({ projects: new Set(), providers: new Set(), states: new Set() });
            persistSearch("");
          }}
          anyFilterActive={anyFilterActive}
          onNewThread={() => actions.openNewThread({ focusPrompt: true })}
        />
        {searched.length === 0 ? (
          <div className="p-4">
            <EmptyState>
              {emptyBecauseFiltered
                ? "No threads match the current group, filter, and search."
                : "No threads to show yet."}
            </EmptyState>
          </div>
        ) : (
          <Board
            columns={columns}
            activeThreadId={openThreadId}
            doneIds={doneIds}
            projectNameFor={(projectId) =>
              projects.find((project) => project.id === projectId)?.name ?? "Personal"
            }
            onOpenThread={openThreadCard}
            onNewTask={() => actions.openNewThread({ focusPrompt: true })}
            onDropDone={(threadId) => {
              const next = new Set(doneIds);
              next.add(threadId);
              setDoneIds(next);
              rpc.call("done_set", { threadId, done: true }).catch(() => {});
            }}
            onDropUnread={(threadId) => {
              const thread = threads.find((candidate) => candidate.id === threadId);
              if (thread !== undefined && !thread.isUnread) {
                void actions.setRead(threadId, false);
              }
            }}
            menuActionsFor={(thread) => {
              const isThreadDone = doneIds.has(thread.id);
              return [
                {
                  id: "open-new-window",
                  label: "Open in new window",
                  icon: "NewTab",
                  run: () => {
                    window.open(
                      new URL(thread.href, window.location.origin).toString(),
                      "_blank",
                    );
                  },
                },
                {
                  id: "pin",
                  label: thread.isPinned ? "Unpin" : "Pin",
                  icon: thread.isPinned ? "PinOff" : "Pin",
                  run: () => void actions.setPinned(thread.id, !thread.isPinned),
                },
                {
                  id: "read",
                  label: thread.isUnread ? "Mark Read" : "Mark Unread",
                  icon: thread.isUnread ? "MailOpen" : "Mail",
                  run: () => void actions.setRead(thread.id, thread.isUnread),
                },
                {
                  id: "done",
                  label: isThreadDone ? "Mark Not Done" : "Mark Done",
                  icon: isThreadDone ? "CircleCheck" : "Check",
                  run: () => {
                    setDoneIds((current) => {
                      const next = new Set(current);
                      if (isThreadDone) next.delete(thread.id);
                      else next.add(thread.id);
                      return next;
                    });
                    rpc.call("done_set", { threadId: thread.id, done: !isThreadDone }).catch(
                      () => {},
                    );
                  },
                },
                {
                  id: "archive",
                  label: thread.isArchived ? "Unarchive" : "Archive",
                  icon: thread.isArchived ? "ArchiveRestore" : "Archive",
                  dividerAbove: true,
                  run: () => {
                    if (thread.isArchived) {
                      sdk.threads.unarchive({ threadId: thread.id }).catch(() => {});
                    } else {
                      actions.archive(thread.id);
                    }
                  },
                },
                {
                  id: "delete",
                  label: "Delete…",
                  icon: "Trash2",
                  danger: true,
                  run: () => actions.requestDelete(thread.id),
                },
              ];
            }}
          />
        )}
      </div>
      {openThread === null ? null : (
        <ThreadPane
          thread={openThread}
          isArchived={openThreadIsArchived}
          isDone={doneIds.has(openThreadId ?? "")}
          onToggleDone={(done) => {
            if (openThreadId === null) return;
            setDoneIds((current) => {
              const next = new Set(current);
              if (done) next.add(openThreadId);
              else next.delete(openThreadId);
              return next;
            });
            rpc.call("done_set", { threadId: openThreadId, done }).catch(() => {});
          }}
          onToggleArchived={() => {
            if (openThreadId === null) return;
            if (openThreadIsArchived) {
              sdk.threads.unarchive({ threadId: openThreadId }).catch(() => {});
            } else {
              actions.archive(openThreadId);
            }
          }}
          onToggleUnread={() => {
            if (openThreadId === null || openThreadActive === null) return;
            void actions.setRead(openThreadId, openThreadActive.isUnread);
          }}
          onRename={(title) => actions.rename(openThread.id, title)}
          onMaximize={() => navigate.toThread(openThread.id)}
          onClose={closeThreadPane}
        />
      )}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "board",
    title: "Thread Board",
    icon: "Columns2",
    path: "board",
    component: BoardPage,
  });
});