import { type ReactNode, useState } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { threadState } from "./grouping";
import { ThreadCardMenu, type CardMenuAction } from "./thread-card-menu";

function relativeTime(timestamp: number, now: number): string {
  const diff = now - timestamp;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACCENT_CLASS: Record<string, string> = {
  working: "bg-blue-500/70",
  attention: "bg-amber-500/80",
  unread: "bg-emerald-500/70",
  idle: "bg-transparent",
};

const DOT_CLASS: Record<string, string> = {
  working: "bg-blue-500",
  attention: "bg-amber-500",
  unread: "bg-emerald-500",
  idle: "bg-muted-foreground/30",
};

interface ThreadCardProps {
  thread: PluginSidebarThread;
  stateDot: ReactNode;
  isActive: boolean;
  isDone: boolean;
  projectName: string;
  menuActions?: readonly CardMenuAction[];
  /** Live children that nest beneath this card, in display order. */
  childThreads?: readonly PluginSidebarThread[];
  /** Parent id → that parent's nested children; used for the `+N more` count. */
  childrenByParent?: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  /** Reduced opacity for family members that did not match the filters. */
  dimmed?: boolean;
  onOpen: () => void;
  /** Open a (nested child) thread's pane. */
  onOpenThread?: (threadId: string) => void;
  /** Right-click menu actions for a nested child thread. */
  childMenuActions?: (thread: PluginSidebarThread) => readonly CardMenuAction[];
}

function ChildRow({
  child,
  onOpenThread,
  menuActions,
}: {
  child: PluginSidebarThread;
  onOpenThread: (threadId: string) => void;
  menuActions?: readonly CardMenuAction[];
}) {
  const now = Date.now();
  const row = (
    <a
      href={child.href}
      draggable={false}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpenThread(child.id);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[11px] leading-snug text-muted-foreground",
        "transition-colors hover:bg-accent/50 hover:text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 shrink-0 rounded-full",
          DOT_CLASS[threadState(child)] ?? "bg-muted-foreground/30",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{child.displayTitle}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
        {relativeTime(child.updatedAt, now)}
      </span>
    </a>
  );
  if (menuActions === undefined) return row;
  return (
    <ThreadCardMenu
      anchor={row}
      actions={menuActions}
      href={child.href}
      onOpen={() => onOpenThread(child.id)}
    />
  );
}

export function ThreadCard({
  thread,
  stateDot,
  isActive,
  isDone,
  projectName,
  menuActions,
  childThreads,
  childrenByParent,
  dimmed,
  onOpen,
  onOpenThread,
  childMenuActions,
}: ThreadCardProps) {
  const now = Date.now();
  const [collapsed, setCollapsed] = useState(false);
  const branch = thread.environment?.branchName ?? thread.host?.name ?? "";
  const children = childThreads ?? [];
  // Depth cap: a level-1 child's own children are not rendered; their total
  // count surfaces as a `+N more` chip that opens the pane. Without the map
  // there is no overflow information, so no chip.
  const overflowCount = childrenByParent
    ? children.reduce(
        (sum, child) => sum + (childrenByParent.get(child.id)?.length ?? 0),
        0,
      )
    : 0;
  const card = (
    <div
      className={cn(
        dimmed && "opacity-50",
        // The nested children render inside this wrapper so the dimming and
        // the indent rail cover the whole family block.
      )}
    >
      <a
        href={thread.href}
        aria-current={isActive ? "true" : undefined}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/thread-board-id", thread.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onClick={(event) => {
          // Let modified clicks (middle-click handled natively, cmd/ctrl new
          // window) pass through; the host also routes plain clicks on href.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onOpen();
        }}
        className={cn(
          "relative block overflow-hidden rounded-md bg-card px-3 py-2 transition-colors",
          "hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "ring-2 ring-ring"
            : "ring-1 ring-transparent hover:ring-border",
          isDone && "opacity-50 saturate-50",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0.5",
            ACCENT_CLASS[threadState(thread)] ?? "bg-transparent",
          )}
          aria-hidden
        />
        <div className="flex items-center gap-1.5 pl-1.5">
          {stateDot}
          {thread.isPinned ? (
            <Icon name="Pin" className="size-3 text-muted-foreground/70" aria-hidden />
          ) : null}
          {thread.hasPendingInteraction ? (
            <Icon
              name="MessageQuestion"
              className="size-3 text-amber-500"
              aria-label={thread.indicatorLabel ?? "Needs your input"}
            />
          ) : null}
          {children.length > 0 ? (
            <>
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand subthreads" : "Collapse subthreads"}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCollapsed((value) => !value);
                }}
                className={cn(
                  "flex items-center gap-0.5 rounded-sm text-muted-foreground/70",
                  "transition-colors hover:bg-accent hover:text-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Icon
                  name={collapsed ? "ChevronRight" : "ChevronDown"}
                  className="size-3"
                  aria-hidden
                />
              </button>
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                {children.length}
              </span>
            </>
          ) : null}
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
            {relativeTime(thread.updatedAt, now)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 pl-1.5 text-[13px] leading-snug">{thread.displayTitle}</p>
        <p className="mt-0.5 truncate pl-1.5 text-[11px] text-muted-foreground/70">
          {projectName}
          {branch === "" ? null : <span className="text-muted-foreground/40"> · {branch}</span>}
        </p>
      </a>
      {children.length > 0 && !collapsed && onOpenThread !== undefined ? (
        <div className="ml-3 mt-1 border-l border-border/70 pl-2">
          <ul className="flex flex-col gap-0.5">
            {children.map((child) => (
              <li key={child.id}>
                <ChildRow
                  child={child}
                  onOpenThread={onOpenThread}
                  menuActions={childMenuActions?.(child)}
                />
              </li>
            ))}
            {overflowCount > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenThread(thread.id);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-1.5 py-1 text-left text-[10px] text-muted-foreground/70",
                    "transition-colors hover:bg-accent/50 hover:text-foreground",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  +{overflowCount} more
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
  if (menuActions === undefined) return card;
  return (
    <ThreadCardMenu anchor={card} actions={menuActions} href={thread.href} onOpen={onOpen} />
  );
}