import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:4174/");
  const manifest = await (
    await page.request.get("http://127.0.0.1:4174/data/manifest.json")
  ).json();
  await expect(page.getByTestId("scene-status")).toHaveText("已更新", {
    timeout: 20000,
  });
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "tang-661-civil tang-661-military",
  );
  await page.getByRole("spinbutton", { name: "年份", exact: true }).fill("460");
  await page
    .getByRole("spinbutton", { name: "年份", exact: true })
    .press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("460");
  await page.locator(".event-glow").waitFor();
  if (await page.locator(".map-fallback").count())
    throw Error("Production map fell back");
  await page.screenshot({ path: "docs/qa/screenshots/production-460.png" });
  await page.getByRole("spinbutton", { name: "年份", exact: true }).fill("661");
  await page
    .getByRole("spinbutton", { name: "年份", exact: true })
    .press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expect(page.locator(".coverage-banner")).toContainText("边界争议");
  await expect(page.locator(".coverage-banner")).not.toContainText(
    "西部主张范围",
  );
  await page.screenshot({ path: "docs/qa/screenshots/production-661.png" });
  const dated = [
    [742, "tang-742-eastern-administration"],
    [610, "sui-610-partial-administration"],
    [
      262,
      "cao-wei-262-administration shu-han-262-administration sun-wu-262-administration",
    ],
    [
      572,
      "chen-572-administration northern-qi-572-administration northern-zhou-572-administration western-liang-nanbei-572-administration",
    ],
  ];
  for (const [n, ids] of dated) {
    const input = page.getByRole("spinbutton", { name: "年份", exact: true });
    await input.fill(String(n));
    await input.press("Enter");
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.locator(".map-canvas")).toHaveAttribute(
      "data-rendered-territory-ids",
      ids,
    );
    await page.screenshot({ path: `docs/qa/screenshots/production-${n}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.screenshot({
    path: "docs/qa/screenshots/production-mobile-572.png",
  });
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
    throw Error("Mobile overflow");
  const banner = await page.locator(".coverage-banner").boundingBox();
  const timeline = await page
    .getByRole("region", { name: "历史时间轴" })
    .boundingBox();
  if (banner.y + banner.height > timeline.y)
    throw Error("Banner overlaps timeline");
  const entry = page.getByRole("spinbutton", { name: "年份", exact: true });
  await entry.fill("610");
  await entry.press("Enter");
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "sui-610-partial-administration",
  );
  await expect(page.locator(".coverage-banner")).toContainText("西部未录入");
  await page.screenshot({
    path: "docs/qa/screenshots/production-mobile-610.png",
  });
  const suiBanner = await page.locator(".coverage-banner").boundingBox();
  const suiTimeline = await page
    .getByRole("region", { name: "历史时间轴" })
    .boundingBox();
  if (suiBanner.y + suiBanner.height > suiTimeline.y)
    throw Error("Sui banner overlaps timeline");
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
    throw Error("Sui mobile overflow");
  await page.setViewportSize({ width: 767, height: 715 });
  await expect(page.locator(".browse-panel")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "条目 · 搜索 · 图层" }),
  ).toBeVisible();
  const caption = await page.locator(".map-caption").boundingBox();
  const polityKey = await page.locator(".map-territory-key").boundingBox();
  if (caption.y + caption.height > polityKey.y)
    throw Error("Narrow caption overlaps polity key");
  await page.screenshot({
    path: "docs/qa/screenshots/production-narrow-610.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "条目 · 搜索 · 图层" }).click();
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  await page.getByRole("button", { name: "查阅742年参考图" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .getByRole("img")
        .evaluate((e) => e.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByTestId("committed-year")).toHaveText("742");
  await page.screenshot({
    path: "docs/qa/screenshots/production-reference-mobile.png",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "tang-742-eastern-administration",
  );
  await expect(page.locator(".coverage-banner")).toContainText("仅105°E以东");
  const tangBanner = await page.locator(".coverage-banner").boundingBox();
  const tangTimeline = await page
    .getByRole("region", { name: "历史时间轴" })
    .boundingBox();
  if (tangBanner.y + tangBanner.height > tangTimeline.y)
    throw Error("Tang banner overlaps timeline");
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
    throw Error("Tang mobile overflow");
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await page.screenshot({
    path: "docs/qa/screenshots/production-mobile-742.png",
  });
  await entry.fill("743");
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("743");
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "",
  );
  await page.getByRole("button", { name: "条目 · 搜索 · 图层" }).click();
  // Check the expanded chronology against the final production build.
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await entry.fill("-221");
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("221");
  await expect(page.locator(".header-year")).toContainText("公元前");
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
    throw Error("BCE mobile overflow");
  await page.screenshot({
    path: "docs/qa/screenshots/production-mobile-qin.png",
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await entry.fill("-1300");
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("1300");
  await expect(page.locator(".event-glow")).toHaveCount(1);
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "",
  );
  await page.screenshot({
    path: "docs/qa/screenshots/production-bce-1300.png",
  });
  await entry.fill("1420");
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("1420");
  await expect(page.locator(".source-plate-shortcut")).toContainText("1580年");
  await page.locator(".source-plate-shortcut").click();
  await expect(page.getByRole("dialog")).toContainText("1580年");
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .getByRole("img")
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    )
    .toBe(true);
  await expect(page.getByTestId("committed-year")).toHaveText("1420");
  await page.screenshot({
    path: "docs/qa/screenshots/production-ming-reference.png",
  });
  await page.keyboard.press("Escape");
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("紫禁城建成");
  await page.screenshot({
    path: "docs/qa/screenshots/production-ming-1420.png",
  });
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await entry.fill("1912");
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText("1912");
  await expect(
    page.getByRole("button", { name: "后一年", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "docs/qa/screenshots/production-qing-1912.png",
  });
  await writeFile(
    "docs/qa/production-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        url: "http://127.0.0.1:4174",
        dataVersion: manifest.version,
        years: [-1300, -221, 262, 572, 610, 460, 661, 742, 743, 1420, 1912],
        workerVerified: true,
        expandedChronology: true,
        bceMobileNoOverflow: true,
        sourceShortcutPreservesYear: true,
        newEventPointVerified: true,
        timelineDirectInitial: true,
        paintedTerritoryIds: {
          ...Object.fromEntries(
            dated.map(([year, ids]) => [year, ids.split(" ")]),
          ),
          661: ["tang-661-civil", "tang-661-military"],
        },
        disputedAdministrationVisible: true,
        claimsOffByDefault: true,
        mobileNoOverflow: true,
        tang742EasternPartial: true,
        tang742AdjacentYearCleared: true,
        tang742MobileNoOverlap: true,
        suiPartialSource: true,
        suiMobileNoOverlap: true,
        narrow767Drawer: true,
        narrow767NoCaptionOverlap: true,
        referencePlateYear: 742,
        referencePlateLoaded: true,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(
    "Production: 262, 572, 610, 661 and 742 polities actually painted, event, desktop/mobile, no errors.",
  );
} finally {
  await browser.close();
}
