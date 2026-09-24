import type { ReactNode } from "react";
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

interface ThreadCardProps {
  thread: PluginSidebarThread;
  stateDot: ReactNode;
  isActive: boolean;
  isDone: boolean;
  projectName: string;
  menuActions?: readonly CardMenuAction[];
  onOpen: () => void;
}

export function ThreadCard({ thread, stateDot, isActive, isDone, projectName, menuActions, onOpen }: ThreadCardProps) {
  const now = Date.now();
  const branch = thread.environment?.branchName ?? thread.host?.name ?? "";
  const card = (
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
  );
  if (menuActions === undefined) return card;
  return (
    <ThreadCardMenu anchor={card} actions={menuActions} href={thread.href} onOpen={onOpen} />
  );
}