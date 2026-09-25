import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import {
  buildColumns,
  columnFor,
  filterThreads,
  matchesFilter,
  threadState,
} from "../components/grouping";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function thread(overrides: Partial<PluginSidebarThread>): PluginSidebarThread {
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

const NOW = 10 * DAY;

describe("threadState", () => {
  it("treats running statuses as working", () => {
    for (const status of ["active", "starting", "stopping", "pending"] as const) {
      expect(threadState(thread({ status }))).toBe("working");
    }
  });

  it("prefers attention over unread", () => {
    expect(
      threadState(thread({ hasPendingInteraction: true, isUnread: true })),
    ).toBe("attention");
    expect(threadState(thread({ indicator: "unread-error" }))).toBe("attention");
  });

  it("maps unread and idle", () => {
    expect(threadState(thread({ isUnread: true }))).toBe("unread");
    expect(threadState(thread({}))).toBe("idle");
  });
});

describe("filterThreads", () => {
  const threads = [
    thread({ id: "a", projectId: "p1", providerId: "prov1", isUnread: true }),
    thread({ id: "b", projectId: "p2", providerId: "prov2" }),
  ];
  const empty = () => new Set<string>();

  it("passes everything when no filter is set", () => {
    expect(filterThreads(threads, { projects: empty(), providers: empty(), states: empty() })).toHaveLength(2);
  });

  it("filters by multiple projects", () => {
    const result = filterThreads(
      threads,
      { projects: new Set(["p2"]), providers: empty(), states: empty() },
    );
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("intersects project, provider, and state selections", () => {
    const result = filterThreads(
      threads,
      {
        projects: new Set(["p2"]),
        providers: new Set(["prov1"]),
        states: empty(),
      },
    );
    expect(result).toHaveLength(0);
  });

  it("filters by state", () => {
    const result = filterThreads(
      threads,
      { projects: empty(), providers: empty(), states: new Set(["unread"]) },
    );
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("matchesFilter", () => {
  const t = thread({ id: "thr_abc", displayTitle: "Fix the login bug" });
  it("matches titles case-insensitively", () => {
    expect(matchesFilter(t, "LOGIN")).toBe(true);
    expect(matchesFilter(t, "nope")).toBe(false);
  });
  it("matches ids", () => {
    expect(matchesFilter(t, "abc")).toBe(true);
  });
});

describe("columnFor", () => {
  const context = {
    projects: [{ id: "proj_a", name: "Alpha", isPersonal: false, href: "", settingsHref: "" }],
    sections: [],
    providers: [{ id: "pi", displayName: "Pi" }],
  };

  it("routes idle threads to age buckets by updatedAt", () => {
    const fresh = columnFor(thread({ updatedAt: NOW - 5 * 1000 }), "status", context, NOW);
    const old = columnFor(thread({ updatedAt: NOW - 8 * DAY }), "status", context, NOW);
    expect(fresh.id).toBe("idle-recent");
    expect(old.id).toBe("idle-awhile");
  });

  it("keeps working threads out of the idle buckets", () => {
    const result = columnFor(thread({ status: "active" }), "status", context, NOW);
    expect(result.id).toBe("working");
  });

  it("labels project columns from context", () => {
    const result = columnFor(thread({ projectId: "proj_a" }), "project", context, NOW);
    expect(result).toEqual({ id: "proj_a", label: "Alpha" });
  });

  it("recency grouping buckets every thread by age", () => {
    expect(columnFor(thread({ updatedAt: NOW - 2 * HOUR }), "recency", context, NOW).id).toBe("today");
    expect(columnFor(thread({ updatedAt: NOW - 2 * DAY }), "recency", context, NOW).id).toBe("earlier");
  });
});

describe("buildColumns", () => {
  const context = {
    projects: [],
    sections: [],
    providers: [],
  };

  it("hides empty columns and shows populated ones", () => {
    const columns = buildColumns(
      [thread({ id: "1", status: "active" })],
      "status",
      context,
      new Map(),
      new Set(),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual(["working"]);
  });

  it("puts pinned threads in a far-left column and done in a far-right one", () => {
    const columns = buildColumns(
      [
        thread({ id: "p", isPinned: true, status: "idle", updatedAt: NOW - 2 * HOUR }),
        thread({ id: "w", status: "active" }),
        thread({ id: "d" }),
      ],
      "status",
      context,
      new Map(),
      new Set(["d"]),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual(["pinned", "working", "done"]);
  });

  it("orders state lanes by attention priority with newest idle buckets leftmost", () => {
    const columns = buildColumns(
      [
        thread({ id: "w", status: "active" }),
        thread({ id: "a", hasPendingInteraction: true }),
        thread({ id: "u", isUnread: true }),
        thread({ id: "recent", updatedAt: NOW - 5 * 1000 }),
        thread({ id: "today", updatedAt: NOW - 2 * HOUR }),
        thread({ id: "earlier", updatedAt: NOW - 2 * DAY }),
        thread({ id: "awhile", updatedAt: NOW - 8 * DAY }),
      ],
      "status",
      context,
      new Map(),
      new Set(),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual([
      "attention",
      "unread",
      "working",
      "idle-recent",
      "idle-today",
      "idle-earlier",
      "idle-awhile",
    ]);
  });

  it("orders recency columns newest-leftmost", () => {
    const columns = buildColumns(
      [
        thread({ id: "awhile", updatedAt: NOW - 8 * DAY }),
        thread({ id: "earlier", updatedAt: NOW - 2 * DAY }),
        thread({ id: "today", updatedAt: NOW - 2 * HOUR }),
        thread({ id: "recent", updatedAt: NOW - 5 * 1000 }),
      ],
      "recency",
      context,
      new Map(),
      new Set(),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual(["recent", "today", "earlier", "awhile"]);
  });

  it("freezes a selected thread's column across state changes", () => {
    const frozen = new Map([["1", { id: "unread", label: "Unread" }]]);
    const columns = buildColumns(
      [thread({ id: "1", status: "active" })],
      "status",
      context,
      frozen,
      new Set(),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual(["unread"]);
  });

  it("keeps done threads dimmed-flagged but still grouped by done", () => {
    const columns = buildColumns(
      [thread({ id: "1", isPinned: true })],
      "status",
      context,
      new Map(),
      new Set(["1"]),
      NOW,
    );
    expect(columns.map((c) => c.id)).toEqual(["done"]);
  });
});