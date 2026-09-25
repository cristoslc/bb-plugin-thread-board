# Thread Board

A kanban board of your bb threads with Kepler-style grouping and filtering.

![Board grouped by Attention, columns reading left to right in order of attention: Pinned, Needs you, Unread, Working, then newest-first idle buckets](docs/screenshots/board-state.png)

![Last activity grouping: every thread bucketed by age, most recent leftmost](docs/screenshots/board-recency.png)

![Opening a card slides in a thread pane with the conversation](docs/screenshots/board-thread-pane.png)

## What it does

- **Group** threads into columns by Attention (attention-priority lanes,
  then recency-decayed idle lanes), Last activity, Project, Provider, Section,
  Environment, or None (one flat column).
- **Filter** by project, provider, and thread state (Working / Needs you /
  Unread / Idle).
- **Search** across thread titles and ids.
- Cards show state, pin, pending-interaction badge, relative update time,
  title, and branch or host. Click opens the thread; modified-click opens it
  in a new window natively.
- Group, filter, and search selections persist per client in localStorage.

The board is a nav panel at **Thread Board** in the sidebar. It reads bb's
live thread view through the plugin SDK's sidebar hooks, so it updates in
real time and makes no server-side writes. Hidden and archived threads are
excluded.

## Development

```sh
npm install
bb plugin build
bb plugin install . --yes
bb plugin reload thread-board
# or: bb plugin dev
npx tsc --noEmit   # typecheck
```