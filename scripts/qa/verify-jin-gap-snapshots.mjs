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
  async function year(n) {
    const input = page.getByRole("spinbutton", { name: "年份", exact: true });
    await input.fill(String(n));
    await input.press("Enter");
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.getByTestId("scene-status")).toHaveText("已更新");
    await expect(page.locator(".map-fallback")).toHaveCount(0);
  }
  const years = {};
  for (const [n, ids] of [
    [279, []],
    [280, ["jin-280-gap-reconstruction"]],
    [281, []],
    [326, []],
    [
      327,
      ["han-zhao-327-gap-reconstruction", "later-zhao-327-gap-reconstruction"],
    ],
    [328, []],
    [408, []],
    [409, ["northern-yan-409-gap-reconstruction"]],
    [410, []],
  ]) {
    await year(n);
    const actual = await canvas.getAttribute("data-rendered-territory-ids");
    years[n] = actual;
    for (const id of ids)
      await expect(canvas).toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`(?:^| )${id}(?: |$)`),
      );
    if (!ids.length)
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        /-gap-reconstruction/,
      );
  }
  const summaries = {};
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  for (const [name, expected] of [
    ["西晋", "有范围资料 30 年 · 仅部分图幅 1 年 · 尚无范围 21 年"],
    ["汉赵", "有范围资料 19 年 · 仅部分图幅 0 年 · 尚无范围 7 年"],
    ["后赵", "有范围资料 11 年 · 仅部分图幅 0 年 · 尚无范围 21 年"],
    ["北燕", "有范围资料 17 年 · 仅部分图幅 0 年 · 尚无范围 11 年"],
  ]) {
    await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill(name);
    await expect(page.getByTestId("annual-coverage-summary")).toContainText(
      expected,
    );
    summaries[name] = await page
      .getByTestId("annual-coverage-summary")
      .innerText();
  }
  await year(327);
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("汉赵");
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/qa/screenshots/production-jin-gaps-327.png",
  });
  await year(280);
  await page.getByRole("button", { name: /查阅280年来源原图/ }).click();
  const sourceImage = page.locator(".plate-viewer img");
  await expect(sourceImage).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("CC BY-SA 4.0");
  expect(
    await sourceImage.evaluate(
      (img) =>
        img.complete && img.naturalWidth === 920 && img.naturalHeight === 1006,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/qa/screenshots/production-jin-gaps-280-source.png",
  });
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await year(409);
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("北燕");
  await page.getByTestId("annual-coverage-summary").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "尚无范围 11 年",
  );
  await expect(page.getByTestId("missing-polities")).toContainText("西秦");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/qa/screenshots/production-jin-gaps-409-mobile.png",
  });
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await page.getByRole("button", { name: /查阅409年来源原图/ }).click();
  await expect(page.locator(".plate-viewer img")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("归属尚未确认");
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  expect(errors).toEqual([]);
  await writeFile(
    "docs/qa/jin-gap-snapshots-check.json",
    JSON.stringify(
      {
        version: manifest.version,
        years,
        summaries,
        errors,
        viewports: [
          { width: 1440, height: 960 },
          { width: 390, height: 844 },
        ],
        sourcePlate280: {
          loaded: true,
          naturalWidth: 920,
          naturalHeight: 1006,
          license: "CC BY-SA 4.0",
        },
        limitations:
          "浏览器验证来源记录、年份切换与显示；不证明历史疆界完整或史学定论。",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      version: manifest.version,
      years: Object.keys(years),
      errors,
    }),
  );
} finally {
  await browser.close();
}
