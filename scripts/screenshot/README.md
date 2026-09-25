# Screenshot harness

Renders the real plugin app (app.tsx + components/) against a mocked
`@get-bb/plugin-sdk/app` with simulated threads, then captures the README
screenshots in `docs/screenshots/` with headless Chrome. No bb server or
host app involved.

- `data.ts` — simulated projects, providers, and threads (shapes mirror the
  SDK's `PluginSidebarThread`).
- `mock-sdk.tsx` — SDK stand-in: hooks return the simulated state, and
  `ThreadChat` renders a canned conversation. Vite aliases the SDK specifier
  here, so the app code runs unmodified.
- `main.tsx` — seeds localStorage from the query string (`?groupBy=…`) and
  mounts the registered panel component.
- `index.html` — defines bb's built-in dark theme tokens (extracted from the
  bb app bundle), a minimal preflight (the plugin's compiled CSS ships
  without one because the host app provides it), and sets
  `data-bb-plugin="thread-board"` so the compiled utilities' scoping matches.
- `shoot.mjs` — the capture driver (three shots: state board, recency
  board, board with the thread pane open).

Regenerate the screenshots:

```sh
npm i --no-save puppeteer-core   # uses the system Chrome, no download
npx vite --config scripts/screenshot/vite.config.ts   # terminal 1
node scripts/screenshot/shoot.mjs                     # terminal 2
```

`CHROME_PATH` and `HARNESS_URL` override the Chrome binary and harness URL.