/**
 * Screenshot harness entry: mounts the real plugin app (app.tsx) against the
 * mocked SDK, after seeding persisted board state from the query string.
 */
import { createRoot } from "react-dom/client";
import "../../dist/app.css";
import "../../app";
import { registeredNavPanel } from "./mock-sdk";

// Seed before the app's useState initializers read localStorage (they run at
// render time below, after these writes).
const params = new URLSearchParams(window.location.search);
const groupBy = params.get("groupBy") ?? "status";
window.localStorage.setItem("focus-board:groupBy", groupBy);
window.localStorage.setItem("focus-board:search", "");
window.localStorage.setItem("focus-board:filter:projects", "[]");
window.localStorage.setItem("focus-board:filter:providers", "[]");
window.localStorage.setItem("focus-board:filter:states", "[]");
window.localStorage.setItem(
  "focus-board:paneWidth",
  params.get("paneWidth") ?? "480",
);

const Component = registeredNavPanel.component;
const rootElement = document.getElementById("root");
if (!Component || !rootElement) throw new Error("harness failed to initialize");
createRoot(rootElement).render(<Component />);