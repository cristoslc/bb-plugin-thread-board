# Thread Board

<p align="center">
  A kanban board of your bb threads with grouping and filtering.
</p>

<p align="center">
  <a href="#install"><img alt="bb plugin" src="https://img.shields.io/badge/install%20with-bb%20plugin-8a2be2"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A518-339933">
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/github/license/cristoslc/bb-plugin-thread-board"></a>
</p>

<p align="center">
  <a href="docs/screenshots/board-thread-pane-dark.png">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/board-thread-pane-dark.png">
      <img src="docs/screenshots/board-thread-pane-light.png" alt="Board grouped by Attention with the thread pane open: Pinned, Needs you, Unread, Working, then newest-first idle buckets, and a conversation pane slid in alongside" width="100%">
    </picture>
  </a>
</p>

## What it does

- **Group** threads into columns by Attention, Last activity, Project,
  Provider, Machine (which bb host the thread runs on), or None (one flat
  column).
- **Filter** by project, provider, and thread state (Working / Needs you /
  Unread / Idle).
- **Search** across thread titles and ids.
- **Nest** subthreads beneath their parent card, Jira-subissue style:
  collapsible child rows on the card, with needs-you children promoted to
  their own column so they never hide, and family-aware filtering that
  surfaces the whole family when any member matches.
- **Sweep** old Done threads and long-idle threads to Archive with a
  two-click arm-then-confirm button per column: the first click arms (shows
  `Sweep N → Archive ?`, highlights and gathers exactly the eligible
  cards), the second click performs, and clicking away disarms. The
  eligible set is frozen at arm time; threads that turn eligible after
  arming wait for the next arm. Thresholds: `doneArchiveDays` (default 7
  days past the Done mark) and `idleArchiveDays` (default 30 days idle),
  both settable with `bb plugin config thread-board set …`. A card-menu
  "Keep from sweep" override exempts a thread from both sweeps.
- Cards show state, pin, pending-interaction badge, relative update time,
  title, and branch or host. Click opens the thread; modified-click opens it
  in a new window natively.
- Group, filter, and search selections persist per client in localStorage.
- Works on desktop and phone: columns scroll horizontally on narrow screens,
  and the thread pane goes full-screen.

The board is a nav panel at **Thread Board** in the sidebar. It reads bb's
live thread view through the plugin SDK's sidebar hooks, so it updates in
real time. It writes through bb's own stores: pin state, read state, and the
Done marks the sweep reads — never thread content. Hidden and archived
threads are excluded.

## Screenshots

<p align="center">
  <a href="docs/screenshots/board-thread-pane-dark.png">
    <img src="docs/screenshots/board-thread-pane-dark.png" alt="Opening a card slides in a thread pane with the conversation" width="85%">
  </a>
  <br>
  <strong>Thread pane</strong> — opening a card slides in the conversation alongside the board
</p>

<p align="center">
  <a href="docs/screenshots/phone-board-light.png">
    <img src="docs/screenshots/phone-board-light.png" alt="Board on a phone: toolbar stacked vertically, columns scrolling horizontally" width="32%">
  </a>
  &nbsp;&nbsp;
  <a href="docs/screenshots/phone-thread-pane-dark.png">
    <img src="docs/screenshots/phone-thread-pane-dark.png" alt="Thread pane full screen on a phone, with the conversation and reply box" width="32%">
  </a>
  <br>
  <strong>Phone</strong> — the toolbar stacks and columns scroll horizontally;
  the thread pane goes full screen
</p>

## Install

Install straight from GitHub, no clone needed:

```sh
bb plugin install https://github.com/cristoslc/bb-plugin-thread-board
```

or pin a version:

```sh
bb plugin install git:https://github.com/cristoslc/bb-plugin-thread-board@v0.1.4
```

To update later, run the same install command again (add `--yes` to skip
the confirmation prompt).

## Development

```sh
npm install
bb plugin build
bb plugin install . --yes
bb plugin reload thread-board
# or: bb plugin dev
npm test           # vitest
npx tsc --noEmit   # typecheck
```