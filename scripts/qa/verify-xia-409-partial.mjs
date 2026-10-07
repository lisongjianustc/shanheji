import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const url = "http://127.0.0.1:4174";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url);
  const manifest = await (
    await page.request.get(`${url}/data/manifest.json`)
  ).json();
  expect(manifest.version).toBe(
    JSON.parse(await readFile("public/data/manifest.json", "utf8")).version,
  );
  const canvas = page.locator(".map-canvas");
  const scenes = {};
  for (const n of [407, 408, 409, 410, 426]) {
    const input = page.getByRole("spinbutton", { name: "年份", exact: true });
    await input.fill(String(n));
    await input.press("Enter");
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.getByTestId("scene-status")).toHaveText("已更新");
    await expect(page.locator(".map-fallback")).toHaveCount(0);
    if (n === 409)
      await expect(canvas).toHaveAttribute(
        "data-rendered-territory-ids",
        /xia-409-partial-reconstruction/,
      );
    else
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        /xia-409-partial-reconstruction/,
      );
    scenes[n] = await canvas.getAttribute("data-rendered-territory-ids");
  }
  await page.getByRole("spinbutton", { name: "年份", exact: true }).fill("409");
  await page
    .getByRole("spinbutton", { name: "年份", exact: true })
    .press("Enter");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /xia-409-partial-reconstruction/,
  );
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page
    .getByRole("textbox", { name: "查找逐年覆盖政权" })
    .fill("夏（赫连氏）");
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "有范围资料 16 年 · 仅部分图幅 1 年 · 尚无范围 8 年",
  );
  const summary = await page.getByTestId("annual-coverage-summary").innerText();
  await expect(page.getByTestId("missing-polities")).toContainText("西秦");
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).blur();
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: /查看夏（赫连氏）.*来源/ })
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "docs/qa/screenshots/production-xia-409-partial.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/qa/screenshots/production-xia-409-mobile.png",
  });
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await page.getByRole("button", { name: /查阅409年来源原图/ }).click();
  await expect(page.getByRole("dialog")).toContainText("12像素");
  await expect(page.getByRole("dialog")).toContainText("CC BY-SA 4.0");
  await page.locator(".plate-viewer img").evaluate((img) => img.decode());
  expect(
    await page
      .locator(".plate-viewer img")
      .evaluate(
        (img) =>
          img.complete &&
          img.naturalWidth === 2000 &&
          img.naturalHeight === 1335,
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await expect(page.locator("body")).not.toHaveClass(/modal-open/);
  const result = {
    version: manifest.version,
    scenes,
    summary,
    sourceImage: { width: 2000, height: 1335, license: "CC BY-SA 4.0" },
    errors,
  };
  await writeFile(
    "docs/qa/xia-409-partial-check.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
