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
      },
    });
    const b = structuredClone(a);
    b.properties.id = "test-later";
    b.properties.validity = {
      ...time(),
      start: { earliest: "0300-07-01", latest: "0300-07-01" },
      label: "300年下半年切片",
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
