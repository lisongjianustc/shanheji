import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { makeCatalog, makePackage, time } from "../fixtures/make";
import { buildSearchIndex } from "../../src/features/search/index";
async function year(page: Page, value: number) {
  const entry = page.getByRole("spinbutton", { name: "年份", exact: true });
  await entry.fill(String(value));
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText(String(value));
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
}
async function fixture(page: Page, corrupt = false, temporal = false) {
  const catalog = makeCatalog(),
    pack = makePackage();
  pack.events.push({
    ...pack.events[0],
    id: "test-unlocated",
    title: "无坐标事件",
    placeIds: [],
  });
  pack.events[0].validity = time(300, 301);
  catalog.entities.push({
    ...catalog.entities[0],
    id: "test-other",
    existence: time(618),
    names: [{ ...catalog.entities[0].names[0], validity: time(618) }],
  });
  if (temporal) {
    const a = pack.territories[0];
    Object.assign(a.properties, {
      temporalSupport: "snapshot",
      snapshotYear: 300,
      validity: {
        ...time(),
        endExclusive: { earliest: "0300-07-01", latest: "0300-07-01" },
        label: "300年上半年切片",
        precision: "range",
      },
    });
    const b = structuredClone(a);
    b.properties.id = "test-later";
    b.properties.validity = {
      ...time(),
      start: { earliest: "0300-07-01", latest: "0300-07-01" },
      label: "300年下半年切片",
      precision: "range",
    };
    pack.territories.push(b);
    pack.events[0].validity = {
      start: { earliest: "0300-05-01", latest: "0300-05-01" },
      endExclusive: { earliest: "0300-05-02", latest: "0300-05-02" },
      precision: "day",
      label: "300年5月1日",
    };
  }
  const resources = new Map<string, string>();
  const store = (path: string, value: unknown) => {
    const body = JSON.stringify(value);
    resources.set(path, body);
    return { path, sha256: createHash("sha256").update(body).digest("hex") };
  };
  const manifest = {
    version: "test",
    scopeVersion: "test",
    catalog: store("catalog.json", catalog),
    searchIndex: store("index.json", buildSearchIndex(catalog, pack.events)),
    packages: [
      {
        ...store("pack.json", pack),
        id: pack.id,
        version: pack.version,
        startYear: 220,
        endYear: 907,
        regionIds: ["china-core"],
      },
    ],
    defaultInterpretationIds: ["test-interpretation"],
    interpretations: [],
  };
  resources.set("manifest.json", JSON.stringify(manifest));
  let broken = corrupt;
  await page.route("http://127.0.0.1:4173/data/**", async (route) => {
    const path = route.request().url().split("/").at(-1)!;
    if (broken && path === "pack.json") {
      broken = false;
      await route.fulfill({ json: { corrupt: true } });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: resources.get(path) ?? "{}",
    });
  });
}
test("正式资源：边界年份、来源详情、连续年份状态与无发布测试数据", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const start = Date.now();
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  const loadMs = Date.now() - start;
  for (const n of [220, 304, 316, 317, 420, 439, 581, 589, 755, 907])
    await year(page, n);
  await year(page, 460);
  await expect(page.locator(".event-glow")).toHaveCount(1);
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("云冈");
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("仅年或范围精度");
  await page.screenshot({ path: "docs/qa/screenshots/desktop-460.png" });
  await page.getByRole("button", { name: "关闭详情" }).click();
  await year(page, 589);
  await page.screenshot({ path: "docs/qa/screenshots/desktop-589.png" });
  await page.getByRole("button", { name: "并行政权", exact: true }).click();
  await year(page, 383);
  await page.getByRole("button", { name: "展开政权带" }).click();
  await page.screenshot({ path: "docs/qa/screenshots/desktop-383.png" });
  expect(errors).toEqual([]);
  expect(await page.locator("body").innerText()).not.toContain("测试国");
  writeFileSync(
    "docs/qa/browser-observations.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        browser:
          "installed Google Chrome; Playwright temporary profile; SwiftShader",
        viewport: "1440x960",
        firstReadyMs: loadMs,
        yearsChecked: [
          220, 304, 316, 317, 420, 439, 581, 589, 755, 907, 460, 383,
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
});
test("地图事件暂停播放，列表无坐标事件与同名搜索、清除筛选", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/");
  await year(page, 300);
  await page.getByRole("button", { name: "播放时间轴" }).click();
  await page
    .getByRole("button", { name: "无坐标事件", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "播放时间轴" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("发生地点或坐标待核");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("测试国");
  await expect(page.locator(".search-results button")).toHaveCount(2);
  await page.getByRole("searchbox").fill("");
  await page.locator(".filter-panel summary").click();
  await page.getByLabel("事件类型", { exact: true }).selectOption("military");
  await expect(page.locator(".empty-state")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator(".event-card")).toHaveCount(2);
});
test("校验损坏可重试；WebGL关闭仍可浏览", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "WebGLRenderingContext", {
      value: undefined,
    });
  });
  await fixture(page, true);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("完整性校验失败");
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await year(page, 300);
  await expect(page.locator(".event-card")).toHaveCount(2);
  await expect(page.getByText("地图暂不可用")).toBeVisible();
});
test("手机抽屉与时间轴不重叠，事件来源可关闭", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await year(page, 460);
  await page.getByRole("button", { name: "条目 · 搜索 · 图层" }).click();
  await page.locator(".event-card").first().click();
  const detail = page.getByRole("complementary", { name: "条目详情" });
  await expect(detail).toBeVisible();
  const box = await detail.boundingBox(),
    timeline = await page
      .getByRole("region", { name: "历史时间轴" })
      .boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(timeline!.y);
  await page.screenshot({ path: "docs/qa/screenshots/mobile-460.png" });
  await page.getByRole("button", { name: "关闭详情" }).click();
  await expect(detail).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("快速跨年份且WebGL关闭仍保持最终选择", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "WebGLRenderingContext", {
      value: undefined,
    }),
  );
  await page.route("**/basemap/**", (route) => route.abort());
  await page.route(
    "http://127.0.0.1:4173/data/package-*.json",
    async (route) => {
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  const input = page.getByRole("spinbutton", { name: "年份", exact: true });
  for (const n of [220, 907, 383]) {
    await input.fill(String(n));
    await input.press("Enter");
  }
  await expect(page.getByTestId("committed-year")).toHaveText("383");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await expect(page.locator(".event-card")).toContainText("淝水之战");
});

test("WebGL可用时底图请求失败仍可查看历史条目", async ({ page }) => {
  let requested = 0;
  await page.route("**/basemap/**", (route) => {
    requested++;
    return route.abort();
  });
  await page.goto("/");
  await expect(
    page.getByText("自然地理底图加载失败；历史条目仍可查阅。"),
  ).toBeVisible({ timeout: 20000 });
  expect(requested).toBeGreaterThan(0);
  // Failed basemap sources can keep initial map load pending until its
  // fallback timeout. Wait for that first scene before testing a new year.
  await expect(page.getByTestId("scene-status")).toHaveText("已更新", {
    timeout: 20000,
  });
  await year(page, 383);
  await expect(page.locator(".event-card")).toContainText("淝水之战");
});
test("同年阶段不叠加且精确事件查询早期切片", async ({ page }) => {
  await fixture(page, false, true);
  await page.goto("/");
  await year(page, 300);
  await expect(page.locator(".coverage-banner")).toContainText(
    "疆域参考：300年下半年切片",
  );
  await page
    .getByLabel("疆域阶段", { exact: true })
    .selectOption("test-territory");
  await expect(page.locator(".coverage-banner")).toContainText(
    "疆域参考：300年上半年切片",
  );
  await page.getByLabel("疆域阶段", { exact: true }).selectOption("");
  await expect(page.locator(".coverage-banner")).toContainText(
    "疆域参考：300年下半年切片",
  );
  await page.locator(".event-card").filter({ hasText: "测试事件" }).click();
  await expect(page.locator(".coverage-banner")).toContainText(
    "疆域参考：300年上半年切片",
  );
  await expect(page.getByLabel("疆域阶段", { exact: true })).toHaveCount(0);
});

test("661年争议图幅可查看，主张单独开启，邻年不外推", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  await expect(page.locator(".territory-panel")).toContainText("存在边界争议");
  await page.getByRole("button", { name: "查看661年图幅" }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expect(page.locator(".coverage-banner")).toContainText("民政范围");
  await expect(page.locator(".coverage-banner")).toContainText("边界争议");
  await page.locator(".filter-panel summary").click();
  await expect(page.getByLabel("主张范围", { exact: true })).not.toBeChecked();
  // Filters commit only after the replacement scene is ready.
  await page.getByLabel("主张范围", { exact: true }).click();
  await expect(page.getByLabel("主张范围", { exact: true })).toBeChecked();
  await expect(page.locator(".coverage-banner")).toContainText("西部主张范围");
  await page.screenshot({ path: "docs/qa/screenshots/territory-661.png" });
  await page.getByRole("button", { name: "并行政权", exact: true }).click();
  await page.locator(".entity-card").filter({ hasText: "唐" }).click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("Kanguole");
  await expect(
    page.getByRole("link", { name: "许可条款（转换几何同许可）" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭详情" }).click();
  await year(page, 662);
  await expect(page.locator(".coverage-banner")).toContainText(
    "缺少可用疆域资料",
  );
});

test("参考图幅可放大查阅、按年定位并在手机关闭", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  for (const n of [262, 572, 610, 742]) {
    await page.getByRole("button", { name: `查阅${n}年参考图` }).click();
    const viewer = page.getByRole("dialog");
    await expect(viewer).toContainText(`${n} 年`);
    const img = viewer.getByRole("img");
    await expect
      .poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.locator(".coverage-banner")).toContainText(
      n === 262 || n === 572 ? "疆域参考" : "缺少可用疆域资料",
    );
    await viewer.getByRole("button", { name: "放大图幅" }).click();
    await expect(viewer.getByLabel("图幅比例")).toHaveText("150%");
    await viewer.getByRole("button", { name: "适合窗口" }).click();
    await page.screenshot({ path: `docs/qa/screenshots/reference-${n}.png` });
    await viewer.getByRole("button", { name: "关闭参考图幅" }).click();
    await expect(viewer).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "条目 · 搜索 · 图层" }).click();
  await page.getByRole("button", { name: "查阅572年参考图" }).click();
  await page.screenshot({ path: "docs/qa/screenshots/reference-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("时间轴直接驱动主图疆域：初始、输入、拖动、播放及节点点击", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  const painted = page.locator(".map-canvas");
  const ids = "tang-661-civil tang-661-military";
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids);
  await expect(
    page.getByRole("region", { name: "当前地图疆域" }),
  ).toContainText("唐 · 行政设置");
  await expect(page.locator(".coverage-banner")).toContainText("边界争议");
  await expect(page.locator(".coverage-banner")).not.toContainText(
    "西部主张范围",
  );
  await page.screenshot({
    path: "docs/qa/screenshots/timeline-direct-661.png",
  });
  await year(page, 662);
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", "");
  await expect(page.getByRole("region", { name: "当前地图疆域" })).toHaveCount(
    0,
  );
  await year(page, 661);
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids);
  await year(page, 660);
  await page.getByRole("slider", { name: "拖动年份" }).evaluate((el) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, "661");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // No pointer release: the drag itself must request and paint the selected year.
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids);
  await year(page, 660);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids);
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await year(page, 662);
  await page.getByRole("button", { name: "跳至661年疆域" }).click();
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/qa/screenshots/timeline-mobile-661.png",
  });
  const timeline = await page
    .getByRole("region", { name: "历史时间轴" })
    .boundingBox();
  const banner = await page.locator(".coverage-banner").boundingBox();
  expect(banner!.y + banner!.height).toBeLessThanOrEqual(timeline!.y);
  expect(errors).toEqual([]);
});

test("新增262与572年分布实际绘制全部政权，详情可点，节点与手机可用", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const painted = page.locator(".map-canvas");
  const ids262 =
    "cao-wei-262-administration shu-han-262-administration sun-wu-262-administration";
  const ids572 =
    "chen-572-administration northern-qi-572-administration northern-zhou-572-administration western-liang-nanbei-572-administration";
  await year(page, 262);
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids262);
  const key = page.getByRole("region", { name: "当前地图疆域" });
  await expect(key).toContainText("曹魏");
  await expect(key).toContainText("蜀汉");
  await expect(key).toContainText("孙吴");
  await page.screenshot({ path: "docs/qa/screenshots/distribution-262.png" });
  const canvas = page.locator(".maplibregl-canvas");
  const mapBox = await canvas.boundingBox();
  await canvas.click({
    position: { x: mapBox!.width * 0.55, y: mapBox!.height * 0.3 },
  });
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("曹魏");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await key.getByRole("button").filter({ hasText: "蜀汉" }).click();
  const detail = page.getByRole("complementary", { name: "条目详情" });
  await expect(detail).toContainText("13.0公里");
  await expect(detail).toContainText("Zhoudadudu");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await year(page, 263);
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", "");
  await page.getByRole("button", { name: "跳至572年疆域" }).click();
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids572);
  await expect(key).toContainText("西梁（江陵）");
  await page.screenshot({ path: "docs/qa/screenshots/distribution-572.png" });
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  await page
    .getByRole("button", { name: "查看262年图幅", exact: true })
    .first()
    .click();
  await expect(painted).toHaveAttribute(
    "data-rendered-territory-ids",
    "cao-wei-262-administration",
  );
  await page.getByRole("button", { name: "查看572年全部已录入政权" }).click();
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids572);
  await year(page, 573);
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", "");
  await year(page, 571);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids572);
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(painted).toHaveAttribute("data-rendered-territory-ids", ids572);
  await page.screenshot({
    path: "docs/qa/screenshots/distribution-mobile-572.png",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(errors).toEqual([]);
});
