import { useState } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { BoardColumn } from "./grouping";
import { threadState } from "./grouping";
import { ThreadCard } from "./thread-card";
import type { CardMenuAction } from "./thread-card-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface BoardProps {
  columns: readonly BoardColumn[];
  activeThreadId: string | null;
  doneIds: ReadonlySet<string>;
  projectNameFor: (projectId: string) => string;
  onOpenThread: (threadId: string) => void;
  onNewTask: () => void;
  /** Drop a card onto the Done column. */
  onDropDone: (threadId: string) => void;
  /** Drop a card onto the Unread column (Attention grouping only). */
  onDropUnread: (threadId: string) => void;
  /** Right-click menu actions for one thread, sidebar-menu style. */
  menuActionsFor: (thread: PluginSidebarThread) => readonly CardMenuAction[];
}

const DOT_CLASS: Record<string, string> = {
  working: "bg-blue-500",
  attention: "bg-amber-500",
  unread: "bg-emerald-500",
  idle: "bg-muted-foreground/30",
};

function StateDot({ thread }: { thread: PluginSidebarThread }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        DOT_CLASS[threadState(thread)] ?? "bg-muted-foreground/30",
      )}
      aria-hidden
    />
  );
}

export function Board({
  columns,
  activeThreadId,
  doneIds,
  projectNameFor,
  onOpenThread,
  onNewTask,
  onDropDone,
  onDropUnread,
  menuActionsFor,
}: BoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  // Only the Done and Unread lanes accept drops; Unread exists as a column
  // only in the Attention grouping.
  const dropHandlerFor = (columnId: string): ((threadId: string) => void) | null => {
    if (columnId === "done") return onDropDone;
    if (columnId === "unread") return onDropUnread;
    return null;
  };
  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-3 pb-3 pt-2">
      <div className="flex h-full min-h-0 items-stretch gap-4">
        {columns.map((column) => {
          const dropHandler = dropHandlerFor(column.id);
          const isDropTarget = dropHandler !== null;
          return (
            <section
              key={column.id}
              aria-label={`${column.label}, ${column.threads.length} threads`}
              onDragOver={
                isDropTarget
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverColumn(column.id);
                    }
                  : undefined
              }
              onDragLeave={isDropTarget ? () => setDragOverColumn((c) => (c === column.id ? null : c)) : undefined}
              onDrop={
                isDropTarget
                  ? (event) => {
                      event.preventDefault();
                      setDragOverColumn(null);
                      const threadId = event.dataTransfer.getData("text/thread-board-id");
                      if (threadId !== "") dropHandler(threadId);
                    }
                  : undefined
              }
              className={cn(
                "flex h-full min-h-0 w-64 shrink-0 flex-col rounded-lg transition-colors",
                dragOverColumn === column.id && "bg-accent/60 ring-2 ring-ring",
              )}
            >
              <header className="flex items-baseline gap-1.5 px-1 pb-1.5">
                <h3 className="truncate text-[11px] font-medium text-muted-foreground">
                  {column.label}
                </h3>
                <span className="text-[11px] tabular-nums text-muted-foreground/60">
                  {column.threads.length}
                </span>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-muted/30 p-1.5">
                {column.threads.length === 0 && dragOverColumn !== column.id ? (
                  isDropTarget ? (
                    <p className="px-1 py-3 text-center text-xs text-muted-foreground/60">
                      Drop to {column.id === "done" ? "mark done" : "mark unread"}
                    </p>
                  ) : null
                ) : null}
                {column.threads.length === 0 ? null : (
                  <ul className="flex flex-col gap-1.5">
                    {column.threads.map((thread) => (
                      <li key={thread.id}>
                        <ThreadCard
                          thread={thread}
                          stateDot={<StateDot thread={thread} />}
                          isActive={thread.id === activeThreadId}
                          isDone={doneIds.has(thread.id)}
                          projectName={projectNameFor(thread.projectId)}
                          menuActions={menuActionsFor(thread)}
                          onOpen={() => onOpenThread(thread.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {column.id === "working" ? (
                  <button
                    type="button"
                    onClick={onNewTask}
                    className={cn(
                      "mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2",
                      "text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <Icon name="Plus" className="size-3.5" aria-hidden />
                    New Task
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}