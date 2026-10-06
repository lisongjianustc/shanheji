import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const url = "http://127.0.0.1:4174";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  await mkdir("docs/qa/screenshots", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url);
  const manifest = await (
    await page.request.get(`${url}/data/manifest.json`)
  ).json();
  const published = JSON.parse(
    await readFile("public/data/manifest.json", "utf8"),
  );
  expect(manifest.version).toBe(published.version);
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  const canvas = page.locator(".map-canvas");
  async function year(n) {
    const input = page.getByRole("spinbutton", { name: "年份", exact: true });
    await input.fill(String(n));
    await input.press("Enter");
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.getByTestId("scene-status")).toHaveText("已更新");
    await expect(page.locator(".map-fallback")).toHaveCount(0);
  }
  const painted = {};
  for (const [n, id, label, screenshot] of [
    [387, 1545, "西燕", "western-yan-387"],
    [393, 1571, "西燕", null],
    [915, 3649, "岐（李茂贞）", "qi-915"],
    [1126, 4803, "西辽", null],
    [1200, 4978, "西辽", "western-liao-1200"],
    [1215, 5385, "西辽", null],
  ]) {
    await year(n);
    await expect(canvas).toHaveAttribute(
      "data-rendered-territory-ids",
      new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
    );
    painted[n] = (
      await canvas.getAttribute("data-rendered-territory-ids")
    ).split(" ");
    if (screenshot)
      await page.screenshot({
        path: `docs/qa/screenshots/production-${screenshot}.png`,
      });
    await page
      .getByRole("button", { name: `查看${label} · 疆域复原来源`, exact: true })
      .click();
    await expect(
      page.getByRole("complementary", { name: "条目详情" }),
    ).toContainText("Cliopatria");
    await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  }
  const missing = {};
  for (const [n, ids, name] of [
    [394, [1545, 1567, 1571], "西燕"],
    [922, [3649, 3691], "岐"],
    [1216, [5385, 5437], "西辽"],
  ]) {
    await year(n);
    for (const id of ids)
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
      );
    await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
    await expect(page.getByTestId("missing-polities")).toContainText(name);
    missing[n] = name;
  }
  const pointChecks = [];
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const close = page.getByRole("button", { name: "关闭浏览", exact: true });
    if (await close.isVisible()) await close.click();
    for (const [n, title] of [
      [907, "李茂贞开岐王府"],
      [924, "李茂贞向后唐称臣"],
    ]) {
      await year(n);
      const point = page.getByRole("button", { name: title, exact: true });
      await expect
        .poll(() =>
          point.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return (
              document
                .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                ?.closest(".event-glow") === el
            );
          }),
        )
        .toBe(true);
      await point.click();
      await expect(
        page.getByRole("complementary", { name: "条目详情" }),
      ).toContainText("非古岐王府");
      if (viewport.width === 390 && n === 924)
        await page.screenshot({
          path: "docs/qa/screenshots/production-qi-point-924-mobile.png",
        });
      await page.getByRole("button", { name: "关闭详情", exact: true }).click();
      pointChecks.push({ year: n, width: viewport.width });
    }
    await year(376);
    await expect(page.getByTestId("map-coverage-gap")).toContainText("东晋");
    await page.getByRole("button", { name: /查阅376年来源原图/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("尚未完成可靠配准");
    await expect(
      dialog.getByRole("link", { name: "CC BY 3.0", exact: true }),
    ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/3.0/");
    await expect
      .poll(() => dialog.getByRole("img").evaluate((img) => img.naturalWidth))
      .toBe(556);
    if (viewport.width === 390)
      await page.screenshot({
        path: "docs/qa/screenshots/production-reference-376-mobile.png",
      });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("committed-year")).toHaveText("376");
    await expect(page.getByTestId("map-coverage-gap")).toContainText("东晋");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  }
  expect(errors).toEqual([]);
  await writeFile(
    "docs/qa/western-intake-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        url,
        dataVersion: manifest.version,
        painted,
        missing,
        pointChecks,
        reference376: {
          naturalWidth: 556,
          license: "CC BY 3.0",
          retainsYear: true,
          missingEasternJinVisible: true,
        },
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Production ${manifest.version}: western polities, expired ranges, Fengxiang dots and 376 source plate verified.`,
  );
} finally {
  await browser.close();
}
