/**
 * Screenshot driver: renders the harness in headless Chrome and captures the
 * README screenshots into docs/screenshots/.
 *
 * One-time setup: `npm i --no-save puppeteer-core` (uses the system Chrome,
 * no browser download). Then, in two terminals:
 *   npx vite --config scripts/screenshot/vite.config.ts
 *   node scripts/screenshot/shoot.mjs
 */
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.HARNESS_URL ?? "http://localhost:5173/";
const OUT = new URL("../../docs/screenshots/", import.meta.url).pathname;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 2560, height: 1000, deviceScaleFactor: 2 },
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();

async function goto(query) {
  await page.goto(`${BASE}${query}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForSelector("section[aria-label]", { timeout: 15_000 });
  await new Promise((resolve) => setTimeout(resolve, 400));
}

await mkdir(OUT, { recursive: true });

console.log("1/3 state board");
await goto("?groupBy=status");
await page.screenshot({ path: `${OUT}board-state.png`, timeout: 30_000 });

console.log("2/3 recency board");
await goto("?groupBy=recency");
await page.screenshot({ path: `${OUT}board-recency.png`, timeout: 30_000 });

console.log("3/3 thread pane");
await goto("?groupBy=status");
// A real mouse click starts an HTML5 drag on the draggable card and swallows
// the mouseup, so dispatch the click programmatically instead.
await page.evaluate(() => {
  const el = document.querySelector('a[href$="thr_permissions"]');
  if (!el) throw new Error("card not found");
  el.click();
});
await page.waitForSelector('aside[aria-label^="Thread:"]', { timeout: 5_000 });
await new Promise((resolve) => setTimeout(resolve, 500));
await page.screenshot({ path: `${OUT}board-thread-pane.png`, timeout: 30_000 });

await browser.close();
console.log("done");