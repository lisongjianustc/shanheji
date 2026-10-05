// Render the unchanged source for the reproducible overlay check (not the user's browser).
import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
await mkdir("data/raw", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 850 },
  });
  await page.setContent(
    await readFile("data/sources/commons/china-742.svg", "utf8"),
  );
  await page.locator("body").evaluate((e) => {
    e.style.margin = "0";
  });
  await page.locator("svg").evaluate((e) => {
    e.style.width = "1000px";
    e.style.height = "850px";
  });
  await page.locator("svg").screenshot({ path: "data/raw/742-source.png" });
} finally {
  await browser.close();
}
