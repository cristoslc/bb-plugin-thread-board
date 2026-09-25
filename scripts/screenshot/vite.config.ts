import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: here,
  resolve: {
    alias: [
      // The harness renders the real app against a simulated SDK.
      {
        find: /^@get-bb\/plugin-sdk\/app$/,
        replacement: fileURLToPath(new URL("./mock-sdk.tsx", import.meta.url)),
      },
      { find: "@", replacement: repoRoot },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});