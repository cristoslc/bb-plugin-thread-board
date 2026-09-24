import { useId, useState } from "react";
import type { PluginSidebarProject } from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterState, GroupBy, ThreadState } from "./grouping";
import { GROUP_BY_OPTIONS } from "./grouping";

interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Linear-model dropdown: clicking a row's label applies it as the single
 * selection (and closes); a checkbox appears in the left margin on hover to
 * add the row to a multi-selection without closing.
 */
interface MultiSelectDropdownProps {
  label: string;
  icon: string;
  selected: ReadonlySet<string>;
  options: readonly DropdownOption[];
  summaryFor: (selected: ReadonlySet<string>) => string;
  onToggle: (value: string) => void;
  onSingleSelect: (value: string) => void;
  onClear: () => void;
  footer?: React.ReactNode;
}

function MultiSelectDropdown({
  label,
  icon,
  selected,
  options,
  summaryFor,
  onToggle,
  onSingleSelect,
  onClear,
  footer,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerId = useId();
  return (
    <div className="relative" id={containerId}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground",
          "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Icon name={icon} className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">{label}:</span>
        <span className="max-w-40 truncate">{summaryFor(selected)}</span>
        <Icon name="ChevronDown" className="size-3 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-9 z-50 max-h-80 min-w-52 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
            <ul role="listbox" aria-label={label}>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <li
                    key={option.value}
                    className="group/option relative"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSingleSelect(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-sm pl-7 pr-2 py-1.5 text-left text-xs",
                        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <Icon
                          name="Check"
                          className="absolute left-1.5 size-3.5 shrink-0 opacity-100"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                    {/* Hover checkbox in the left margin: adds to the
                        multi-selection without closing the menu. */}
                    <span
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Add ${option.label} to selection`}
                      tabIndex={isSelected ? -1 : 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggle(option.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggle(option.value);
                        }
                      }}
                      className={cn(
                        "absolute left-1.5 top-1/2 flex size-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[3px] border",
                        "opacity-0 transition-opacity group-hover/option:opacity-100",
                        "bg-background",
                        isSelected
                          ? "opacity-100 border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/50 hover:border-foreground",
                      )}
                    >
                      {isSelected ? (
                        <Icon name="Check" className="size-2.5" aria-hidden />
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {footer !== undefined ? (
              <div className="mt-1 border-t border-border pt-1">{footer}</div>
            ) : null}
            {selected.size > 0 ? (
              <div className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Icon name="X" className="size-3.5 shrink-0" aria-hidden />
                  Clear selection
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

interface ProjectDropdownProps {
  projects: readonly PluginSidebarProject[];
  selected: ReadonlySet<string>;
  onToggle: (projectId: string) => void;
  onSingleSelect: (projectId: string) => void;
  onClear: () => void;
  onCreate: (name: string) => Promise<void>;
}

function ProjectDropdown({
  projects,
  selected,
  onToggle,
  onSingleSelect,
  onClear,
  onCreate,
}: ProjectDropdownProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createPending, setCreatePending] = useState(false);

  // Alphabetically sorted; the personal project keeps its own name.
  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const nameFor = (id: string): string =>
    projects.find((project) => project.id === id)?.name ?? id;

  const submitCreate = async () => {
    const name = newName.trim();
    if (name === "" || createPending) return;
    setCreatePending(true);
    try {
      await onCreate(name);
      setNewName("");
      setCreating(false);
    } finally {
      setCreatePending(false);
    }
  };

  return (
    <MultiSelectDropdown
      label="Project"
      icon="Folder"
      selected={selected}
      options={sorted.map((project) => ({ value: project.id, label: project.name }))}
      summaryFor={(current) =>
        current.size === 0
          ? "All projects"
          : current.size === 1
            ? nameFor([...current][0])
            : `${current.size} projects`
      }
      onToggle={onToggle}
      onSingleSelect={onSingleSelect}
      onClear={onClear}
      footer={
        creating ? (
          <div className="flex items-center gap-1 px-1 py-1">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitCreate();
                } else if (event.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Project name"
              aria-label="New project name"
              autoFocus
              className="h-7 text-xs"
            />
            <button
              type="button"
              disabled={createPending || newName.trim() === ""}
              onClick={() => void submitCreate()}
              className="inline-flex h-7 shrink-0 items-center rounded-md px-2 text-xs text-foreground hover:bg-accent disabled:opacity-50"
            >
              <Icon name="Check" className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon name="FolderPlus" className="size-3.5 shrink-0" aria-hidden />
            New project…
          </button>
        )
      }
    />
  );
}

interface BoardToolbarProps {
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  search: string;
  onSearchChange: (value: string) => void;
  projectIds: ReadonlySet<string>;
  providerIds: ReadonlySet<string>;
  projects: readonly PluginSidebarProject[];
  providers: readonly { id: string; displayName?: string }[];
  onCreateProject: (name: string) => Promise<void>;
  totalCount: number;
  onClearFilters: () => void;
  anyFilterActive: boolean;
}

const STATE_OPTIONS: readonly { value: ThreadState; label: string }[] = [
  { value: "working", label: "Working" },
  { value: "attention", label: "Needs you" },
  { value: "unread", label: "Unread" },
  { value: "idle", label: "Idle" },
];

export function BoardToolbar({
  groupBy,
  onGroupByChange,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  projectIds,
  providerIds,
  projects,
  providers,
  onCreateProject,
  totalCount,
  onClearFilters,
  anyFilterActive,
}: BoardToolbarProps) {
  const groupOptions = GROUP_BY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));
  const providerNameFor = (id: string): string =>
    providers.find((provider) => provider.id === id)?.displayName ?? id;
  const providerOptions: DropdownOption[] = [...providerIds]
    .map((id) => ({ value: id, label: providerNameFor(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <MultiSelectDropdown
        label="Group"
        icon="SlidersHorizontal"
        selected={new Set([groupBy])}
        options={groupOptions}
        summaryFor={() => GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label ?? groupBy}
        onToggle={() => {}}
        onSingleSelect={(value) => onGroupByChange(value as GroupBy)}
        onClear={() => {}}
      />
      <ProjectDropdown
        projects={projects.filter((project) => projectIds.has(project.id) || !project.isPersonal)}
        selected={filter.projects}
        onToggle={(projectId) => {
          const next = new Set(filter.projects);
          if (next.has(projectId)) next.delete(projectId);
          else next.add(projectId);
          onFilterChange({ ...filter, projects: next });
        }}
        onSingleSelect={(projectId) =>
          onFilterChange({ ...filter, projects: new Set([projectId]) })
        }
        onClear={() => onFilterChange({ ...filter, projects: new Set() })}
        onCreate={onCreateProject}
      />
      <MultiSelectDropdown
        label="Provider"
        icon="Bot"
        selected={filter.providers}
        options={providerOptions}
        summaryFor={(current) =>
          current.size === 0
            ? "All providers"
            : current.size === 1
              ? providerNameFor([...current][0])
              : `${current.size} providers`
        }
        onToggle={(providerId) => {
          const next = new Set(filter.providers);
          if (next.has(providerId)) next.delete(providerId);
          else next.add(providerId);
          onFilterChange({ ...filter, providers: next });
        }}
        onSingleSelect={(providerId) =>
          onFilterChange({ ...filter, providers: new Set([providerId]) })
        }
        onClear={() => onFilterChange({ ...filter, providers: new Set() })}
      />
      <MultiSelectDropdown
        label="State"
        icon="FilterHorizontal"
        selected={filter.states}
        options={STATE_OPTIONS}
        summaryFor={(current) =>
          current.size === 0
            ? "Any state"
            : current.size === 1
              ? (STATE_OPTIONS.find((option) => option.value === [...current][0])?.label ??
                "1 state")
              : `${current.size} states`
        }
        onToggle={(state) => {
          const next = new Set(filter.states);
          if (next.has(state as ThreadState)) next.delete(state as ThreadState);
          else next.add(state as ThreadState);
          onFilterChange({ ...filter, states: next });
        }}
        onSingleSelect={(state) =>
          onFilterChange({ ...filter, states: new Set([state as ThreadState]) })
        }
        onClear={() => onFilterChange({ ...filter, states: new Set() })}
      />
      <div className="relative ml-auto min-w-36 flex-1 sm:max-w-64">
        <Icon
          name="Search"
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title or id…"
          aria-label="Search threads"
          className="h-8 pl-7 text-xs"
        />
      </div>
      {anyFilterActive ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icon name="X" className="size-3.5" aria-hidden />
          Clear
        </button>
      ) : null}
      <span className="text-xs text-muted-foreground">{totalCount} threads</span>
    </div>
  );
}