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
  const painted = {};
  for (const [n, ids] of [
    [888, [3463]],
    [896, [3492, 3463]],
    [911, [3630, 3463]],
    [925, [3687, 3463]],
    [970, [3706, 3463]],
    [989, [3706, 3463]],
    [1010, [4163]],
    [1125, [4373]],
    [1138, [4816]],
  ]) {
    await year(n);
    for (const id of ids)
      await expect(canvas).toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
      );
    painted[n] = (
      await canvas.getAttribute("data-rendered-territory-ids")
    ).split(" ");
    if (n === 970) {
      await page.screenshot({
        path: "docs/qa/screenshots/production-oasis-970.png",
      });
      await page
        .getByRole("button", {
          name: "查看高昌回鹘 · 疆域复原来源",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("complementary", { name: "条目详情" }),
      ).toContainText("888—1009年");
      await expect(
        page.getByRole("complementary", { name: "条目详情" }),
      ).toContainText("CC BY 4.0");
      await page.getByRole("button", { name: "关闭详情", exact: true }).click();
    }
  }
  await year(989);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("990");
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  for (const id of [3706, 4070, 4309])
    await expect(canvas).not.toHaveAttribute(
      "data-rendered-territory-ids",
      new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
    );
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await expect(page.getByTestId("missing-polities")).toContainText("甘州回鹘");
  await expect(page.locator(".coverage-panel")).not.toContainText(
    "新扩展时段尚无配准疆域切片",
  );
  await year(1139);
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-4816/,
  );
  await expect(page.getByTestId("missing-polities")).toContainText("高昌回鹘");
  const pointChecks = [];
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 767, height: 733 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const close = page.getByRole("button", { name: "关闭浏览", exact: true });
    if (await close.isVisible()) await close.click();
    for (const [n, title, place] of [
      [866, "高昌回鹘建立", "吐鲁番"],
      [1028, "甘州陷落，甘州回鹘本土政权结束", "张掖"],
      [1209, "高昌回鹘归附蒙古", "吐鲁番"],
    ]) {
      await year(n);
      const point = page
        .locator(".event-glow")
        .and(page.getByRole("button", { name: title, exact: true }));
      await expect
        .poll(() =>
          point.evaluate((el) => {
            const r = el.getBoundingClientRect(),
              c = document.querySelector(".map-canvas").getBoundingClientRect();
            return (
              r.left >= c.left &&
              r.right <= c.right &&
              r.top >= c.top &&
              r.bottom <= c.bottom &&
              document
                .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                ?.closest(".event-glow") === el &&
              [
                ...document.querySelectorAll(
                  ".map-territory-key,.coverage-banner",
                ),
              ].every((overlay) => {
                const b = overlay.getBoundingClientRect();
                return (
                  r.right <= b.left ||
                  r.left >= b.right ||
                  r.bottom <= b.top ||
                  r.top >= b.bottom
                );
              })
            );
          }),
        )
        .toBe(true);
      await point.click();
      const detail = page.getByRole("complementary", { name: "条目详情" });
      await expect(detail).toContainText(place);
      await expect(detail).toContainText("地区参考");
      await expect(detail).toContainText("确点");
      if (n === 1209)
        await expect(detail).toContainText("不将归附当作政权立即消失");
      if (n === 1209 && viewport.width === 390)
        await page.screenshot({
          path: "docs/qa/screenshots/production-oasis-point-1209-mobile.png",
        });
      await page.getByRole("button", { name: "关闭详情", exact: true }).click();
      pointChecks.push({ year: n, width: viewport.width });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    }
    await year(970);
    await expect(canvas).toHaveAttribute(
      "data-rendered-territory-ids",
      /clio-v021-3706/,
    );
    await expect(canvas).toHaveAttribute(
      "data-rendered-territory-ids",
      /clio-v021-3463/,
    );
    if (viewport.width === 767)
      await page.screenshot({
        path: "docs/qa/screenshots/production-oasis-970-narrow.png",
      });
  }
  expect(errors).toEqual([]);
  await writeFile(
    "docs/qa/oasis-intake-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        url,
        dataVersion: manifest.version,
        painted,
        clearedAt990: true,
        missingQochoAt1139: true,
        retainsQochoAt1209: true,
        pointChecks,
        mobileNoOverflow: true,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Production ${manifest.version}: oasis ranges, 989 to 990 playback and unobstructed regional dots verified.`,
  );
} finally {
  await browser.close();
}
