import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { withSweepGather } from "../components/grouping";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function thread(overrides: Partial<PluginSidebarThread> & { id: string }): PluginSidebarThread {
  return {
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

describe("withSweepGather", () => {
  it("moves armed candidates above the rest, keeping armed order and relative order of the rest", () => {
    const threads = [
      thread({ id: "recent", updatedAt: 10 }),
      thread({ id: "old", updatedAt: 1 }),
      thread({ id: "mid", updatedAt: 5 }),
      thread({ id: "older", updatedAt: 2 }),
    ];
    const gathered = withSweepGather(threads, ["mid", "older"]);
    expect(gathered.map((thread) => thread.id)).toEqual(["mid", "older", "recent", "old"]);
  });

  it("leaves the column unchanged when nothing is armed", () => {
    const threads = [thread({ id: "a", updatedAt: 2 }), thread({ id: "b", updatedAt: 1 })];
    const gathered = withSweepGather(threads, []);
    expect(gathered.map((thread) => thread.id)).toEqual(["a", "b"]);
  });

  it("ignores armed ids that are not in the column", () => {
    const threads = [thread({ id: "a" })];
    const gathered = withSweepGather(threads, ["gone"]);
    expect(gathered.map((thread) => thread.id)).toEqual(["a"]);
  });

  it("keeps every card present exactly once when the armed list duplicates an id", () => {
    const threads = [thread({ id: "a" }), thread({ id: "b" })];
    const gathered = withSweepGather(threads, ["a", "a"]);
    expect(gathered.map((thread) => thread.id).sort()).toEqual(["a", "b"]);
    expect(gathered).toHaveLength(2);
  });
});