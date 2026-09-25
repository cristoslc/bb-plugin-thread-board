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

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 2 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2 }, // iPhone 14-ish
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: VIEWPORTS.desktop,
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();

let currentTheme = "dark";

// The harness's palette is driven by the `dark` class on <html>; flipping it
// is how we capture both theme variants of each shot.
async function setTheme(theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

async function setViewport(name) {
  await page.setViewport(VIEWPORTS[name]);
}

async function goto(query) {
  await page.goto(`${BASE}${query}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForSelector("section[aria-label]", { timeout: 15_000 });
  await setTheme(currentTheme);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}${name}-${currentTheme}.png`, timeout: 30_000 });
}

async function captureAll() {
  console.log("  thread pane");
  await setViewport("desktop");
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
  await shot("board-thread-pane");

  console.log("  phone board");
  await setViewport("phone");
  await goto("?groupBy=status");
  await shot("phone-board");

  console.log("  phone thread pane");
  await page.evaluate(() => {
    const el = document.querySelector('a[href$="thr_permissions"]');
    if (!el) throw new Error("card not found");
    el.click();
  });
  await page.waitForSelector('aside[aria-label^="Thread:"]', { timeout: 5_000 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await shot("phone-thread-pane");
}

await mkdir(OUT, { recursive: true });

for (const theme of ["dark", "light"]) {
  currentTheme = theme;
  console.log(`${theme} theme`);
  await captureAll();
}

await browser.close();
console.log("done");