import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

/**
 * Shared `PluginSidebarThread` fixture for tests. Mirrors the shape used in
 * `tests/grouping.test.ts`; tests override the fields they care about.
 */
export function thread(overrides: Partial<PluginSidebarThread>): PluginSidebarThread {
  return {
    id: "thr_test",
    projectId: "proj_a",
    title: "Test thread",
    titleFallback: null,
    displayTitle: "Test thread",
    parentThreadId: null,
    lifecycleOwnerThreadId: null,
    sourceThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "pi",
    status: "idle",
    runtimeStatus: "idle",
    queuedWork: "none",
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    pinnedAt: null,
    pinSortKey: null,
    isArchived: false,
    archivedAt: null,
    href: "/projects/p/threads/t",
    isHidden: false,
    environment: null,
    host: null,
    createdAt: 0,
    updatedAt: 0,
    lastReadAt: null,
    latestAttentionAt: 0,
    ...overrides,
  } as PluginSidebarThread;
}