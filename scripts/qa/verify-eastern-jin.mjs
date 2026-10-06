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
  const m = await (await page.request.get(`${url}/data/manifest.json`)).json();
  expect(m.version).toBe(
    JSON.parse(await readFile("public/data/manifest.json", "utf8")).version,
  );
  const canvas = page.locator(".map-canvas");
  async function year(n) {
    const input = page.getByRole("spinbutton", { name: "年份", exact: true });
    await input.fill(String(n));
    await input.press("Enter");
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.getByTestId("scene-status")).toHaveText("已更新");
    await expect(page.locator(".map-fallback")).toHaveCount(0);
  }
  const records = {};
  for (const n of [327, 328, 383, 384, 409, 410]) {
    await year(n);
    records[n] = await canvas.getAttribute("data-rendered-territory-ids");
    if ([327, 383, 409].includes(n))
      await expect(canvas).toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`jin-${n}-partial-reconstruction`),
      );
    else
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        /jin-\d+-partial-reconstruction/,
      );
  }
  await year(383);
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("东晋");
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "仅部分图幅 3 年 · 尚无范围 101 年",
  );
  await page
    .getByRole("button", { name: "384—408年 尚无范围", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("384");
  await expect(page.getByTestId("missing-polities")).toContainText("东晋");
  await page
    .getByRole("button", { name: "383年 仅部分图幅", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("383");
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/qa/screenshots/production-eastern-jin-annual.png",
  });
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("淝水之战");
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await page.getByRole("button", { name: /查阅383年来源原图/ }).click();
  await expect(page.locator(".plate-viewer img")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("CC BY-SA 4.0");
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("东晋");
  await page
    .getByRole("button", { name: "409年 仅部分图幅", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("409");
  await page.screenshot({
    path: "docs/qa/screenshots/production-eastern-jin-mobile.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await year(383);
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("淝水之战");
  await page.screenshot({
    path: "docs/qa/screenshots/production-eastern-jin-383-mobile-point.png",
  });
  expect(errors).toEqual([]);
  await writeFile(
    "docs/qa/eastern-jin-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        version: m.version,
        records,
        annualSummary: "东晋317—420：3年部分图幅、101年缺失",
        viewports: ["1440×960", "390×844"],
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ version: m.version, records, errors }));
} finally {
  await browser.close();
}
