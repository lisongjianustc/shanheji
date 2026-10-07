import { test, expect, type Page, type Locator } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { makeCatalog, makePackage, time } from "../fixtures/make";
import { buildSearchIndex } from "../../src/features/search/index";
test("河西与高昌回鹘轮廓按来源年份切换，990年播放停止时不延用甘州旧图", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const canvas = page.locator(".map-canvas");
  for (const [n, ids] of [
    [888, [3463]],
    [896, [3492, 3463]],
    [911, [3630, 3463]],
    [925, [3687, 3463]],
    [989, [3706, 3463]],
    [1010, [4163]],
    [1125, [4373]],
    [1138, [4816]],
  ] as const) {
    await year(page, n);
    for (const id of ids)
      await expect(canvas).toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
      );
  }
  await year(page, 989);
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
  await year(page, 1139);
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-4816/,
  );
  await expect(page.getByTestId("missing-polities")).toContainText("高昌回鹘");
  await year(page, 1209);
  await expect(page.getByTestId("missing-polities")).toContainText("高昌回鹘");
});
test("回鹘纪事的地区亮点在桌面、窄窗、手机无遮挡，点击可查看位置限度", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 767, height: 733 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [n, title, place] of [
      [866, "高昌回鹘建立", "吐鲁番"],
      [1028, "甘州陷落，甘州回鹘本土政权结束", "张掖"],
      [1209, "高昌回鹘归附蒙古", "吐鲁番"],
    ] as const) {
      await year(page, n);
      const point = page
        .locator(".event-glow")
        .and(page.getByRole("button", { name: title, exact: true }));
      await expect
        .poll(() =>
          point.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const canvas = document
              .querySelector(".map-canvas")!
              .getBoundingClientRect();
            return (
              r.left >= canvas.left &&
              r.right <= canvas.right &&
              r.top >= canvas.top &&
              r.bottom <= canvas.bottom &&
              document
                .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                ?.closest(".event-glow") === el &&
              [
                ...document.querySelectorAll(
                  ".map-territory-key, .coverage-banner",
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
      await expect(detail).toContainText(title);
      await expect(detail).toContainText(place);
      await expect(detail).toContainText("地区参考");
      await expect(detail).toContainText("确点");
      if (n === 1209)
        await expect(detail).toContainText("不将归附当作政权立即消失");
      await page.getByRole("button", { name: "关闭详情", exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    }
  }
});
test("376年东晋原图可查阅但不冒充主图疆域，手机关闭后年份保留", async ({
  page,
}) => {
  await page.goto("/");
  await year(page, 376);
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: /查阅376年来源原图/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("尚未完成可靠配准");
    await expect(dialog).toContainText("CC BY 3.0");
    await expect(
      dialog.getByRole("link", { name: "CC BY 3.0", exact: true }),
    ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/3.0/");
    await expect
      .poll(() =>
        dialog
          .getByRole("img")
          .evaluate((el: HTMLImageElement) => el.naturalWidth),
      )
      .toBe(556);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("committed-year")).toHaveText("376");
  }
});
test("西燕、岐和西辽随来源区间绘制，越界终年保留缺口，凤翔亮点可点击", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const canvas = page.locator(".map-canvas");
  for (const [n, id, name] of [
    [387, 1545, "西燕"],
    [393, 1571, "西燕"],
    [915, 3649, "岐（李茂贞）"],
    [1126, 4803, "西辽"],
    [1200, 4978, "西辽"],
    [1215, 5385, "西辽"],
  ] as const) {
    await year(page, n);
    await expect(canvas).toHaveAttribute(
      "data-rendered-territory-ids",
      new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
    );
    await page
      .getByRole("button", { name: `查看${name} · 疆域复原来源`, exact: true })
      .click();
    await expect(
      page.getByRole("complementary", { name: "条目详情" }),
    ).toContainText("Cliopatria");
    await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  }
  for (const [n, ids, name] of [
    [394, [1545, 1567, 1571], "西燕"],
    [922, [3649, 3691], "岐"],
    [1216, [5385, 5437], "西辽"],
  ] as const) {
    await year(page, n);
    for (const id of ids)
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(`(?:^| )clio-v021-${id}(?: |$)`),
      );
    await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
    await expect(page.getByTestId("missing-polities")).toContainText(name);
  }
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
    ] as const) {
      await year(page, n);
      await page.getByRole("button", { name: title, exact: true }).click();
      await expect(
        page.getByRole("complementary", { name: "条目详情" }),
      ).toContainText("非古岐王府");
      await page.getByRole("button", { name: "关闭详情", exact: true }).click();
    }
  }
});
test("窄窗口事件亮点不被疆域与资料浮层遮挡", async ({ page }) => {
  for (const viewport of [
    { width: 767, height: 733 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await year(page, 700);
    const point = page.getByRole("button", {
      name: "武则天金简纪年",
      exact: true,
    });
    await expect
      .poll(() =>
        point.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return [
            ...document.querySelectorAll(
              ".map-territory-key, .coverage-banner",
            ),
          ].every((overlay) => {
            const b = overlay.getBoundingClientRect();
            return (
              r.right <= b.left ||
              r.left >= b.right ||
              r.bottom <= b.top ||
              r.top >= b.bottom
            );
          });
        }),
      )
      .toBe(true);
    await expect
      .poll(() =>
        point.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
      )
      .toBe(true);
    await point.click();
    await expect(
      page.getByRole("complementary", { name: "条目详情" }),
    ).toContainText("武则天金简纪年");
    await page.getByRole("button", { name: "关闭详情", exact: true }).click();
    await page
      .getByRole("button", { name: "查看本年疆域缺口", exact: true })
      .click();
    await expect(page.getByTestId("missing-polities")).toContainText("武周");
  }
});
async function expectCuratedPaint(target: Locator, ids: string) {
  await expect
    .poll(async () =>
      ((await target.getAttribute("data-rendered-territory-ids")) ?? "")
        .split(" ")
        .filter((id) => id && !id.startsWith("clio-"))
        .sort()
        .join(" "),
    )
    .toBe(ids.split(" ").filter(Boolean).sort().join(" "));
}
async function year(page: Page, value: number) {
  const entry = page.getByRole("spinbutton", { name: "年份", exact: true });
  await entry.fill(String(value));
  await entry.press("Enter");
  await expect(page.getByTestId("committed-year")).toHaveText(
    String(Math.abs(value)),
  );
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
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("淝水之战");
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("非古战场确点");
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
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
  await page
    .locator(".territory-slice")
    .filter({ hasText: "Kanguole 661年图幅" })
    .getByRole("button", { name: "查看661年图幅", exact: true })
    .click();
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
    "当前筛选条件下没有疆域记录",
  );
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    "",
  );
});

test("参考图幅可放大查阅、按年定位并在手机关闭", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  for (const n of [262, 572, 610, 742]) {
    await page.getByRole("button", { name: `查阅${n}年参考图` }).click();
    const viewer = page.getByRole("dialog");
    await expect(viewer).toContainText(`${n}年`);
    const img = viewer.getByRole("img");
    await expect
      .poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.getByTestId("committed-year")).toHaveText(String(n));
    await expect(page.locator(".coverage-banner")).toContainText("疆域参考");
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
  await expectCuratedPaint(painted, ids);
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
  await expectCuratedPaint(painted, "");
  await expect(
    page.getByRole("region", { name: "当前地图疆域" }),
  ).toContainText("疆域复原");
  await year(page, 661);
  await expectCuratedPaint(painted, ids);
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
  await expectCuratedPaint(painted, ids);
  await year(page, 660);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("661");
  await expectCuratedPaint(painted, ids);
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await year(page, 662);
  await page.getByRole("button", { name: "跳至661年疆域" }).click();
  await expectCuratedPaint(painted, ids);
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
  await expectCuratedPaint(painted, ids262);
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
  await expectCuratedPaint(painted, "");
  await page.getByRole("button", { name: "跳至572年疆域" }).click();
  await expectCuratedPaint(painted, ids572);
  await expect(key).toContainText("西梁（江陵）");
  await page.screenshot({ path: "docs/qa/screenshots/distribution-572.png" });
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  await page
    .getByRole("button", { name: "查看262年图幅", exact: true })
    .first()
    .click();
  await expectCuratedPaint(painted, "cao-wei-262-administration");
  await page.getByRole("button", { name: "查看572年全部已录入政权" }).click();
  await expectCuratedPaint(painted, ids572);
  await year(page, 573);
  await expectCuratedPaint(painted, "");
  await year(page, 571);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expectCuratedPaint(painted, ids572);
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCuratedPaint(painted, ids572);
  await page.screenshot({
    path: "docs/qa/screenshots/distribution-mobile-572.png",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(errors).toEqual([]);
});

test("约610年部分隋朝范围随节点更新，西部缺口标明且下一年清空", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "跳至610年疆域" }).click();
  const canvas = page.locator(".map-canvas");
  await expectCuratedPaint(canvas, "sui-610-partial-administration");
  const key = page.getByRole("region", { name: "当前地图疆域" });
  await expect(key).toContainText("隋");
  await expect(key).toContainText("部分范围");
  await expect(page.locator(".coverage-banner")).toContainText("西部未录入");
  await key
    .getByRole("button", { name: /查看(?:隋|唐) · 行政设置来源/ })
    .click();
  const detail = page.getByRole("complementary", { name: "条目详情" });
  await expect(detail).toContainText("裁切边缘不绘制国界");
  await expect(detail).toContainText("47.2公里");
  await expect(detail).toContainText("Yug");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await page.setViewportSize({ width: 767, height: 715 });
  await expect(page.locator(".browse-panel")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "条目 · 搜索 · 图层" }),
  ).toBeVisible();
  const caption = await page.locator(".map-caption").boundingBox();
  const polityKey = await key.boundingBox();
  expect(caption!.y + caption!.height).toBeLessThanOrEqual(polityKey!.y);
  await page.setViewportSize({ width: 1440, height: 960 });
  await year(page, 611);
  await expectCuratedPaint(canvas, "");
  await year(page, 609);
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expectCuratedPaint(canvas, "sui-610-partial-administration");
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCuratedPaint(canvas, "sui-610-partial-administration");
  const banner = await page.locator(".coverage-banner").boundingBox();
  const timeline = await page
    .getByRole("region", { name: "历史时间轴" })
    .boundingBox();
  expect(banner!.y + banner!.height).toBeLessThanOrEqual(timeline!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "docs/qa/screenshots/distribution-mobile-610.png",
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await year(page, 609);
  await page.locator("summary").filter({ hasText: "筛选与图层" }).click();
  await page
    .getByRole("combobox", { name: "政权筛选", exact: true })
    .selectOption("sui");
  await expect(
    page.getByRole("combobox", { name: "政权筛选", exact: true }),
  ).toHaveValue("sui");
  const referenceToggle = page.getByRole("checkbox", {
    name: "允许显示近年参考切片",
  });
  await referenceToggle.click();
  await expect(referenceToggle).toBeChecked();
  await expectCuratedPaint(canvas, "sui-610-partial-administration");
  await expect(page.locator(".coverage-banner")).toContainText("约610年");
  await expect(page.locator(".coverage-banner")).not.toContainText("约609年");
});

test("夏商周至明清：公元前年份、跨纪元播放、并行政权与新增事件点", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.getByRole("button", { name: "夏（约）", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("2100");
  await expect(page.locator(".header-year")).toContainText("公元前");
  await page.getByRole("button", { name: "并行政权", exact: true }).click();
  await expect(page.locator(".entity-card")).toContainText("未确证");
  await year(page, -1300);
  await expect(page.locator(".event-glow")).toHaveCount(1);
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("殷成为商代晚期都城");
  await expect(
    page
      .getByRole("complementary", { name: "条目详情" })
      .getByRole("link", { name: "Yin Xu ↗" }),
  ).toHaveAttribute("href", "https://whc.unesco.org/en/list/1114/");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await page.screenshot({ path: "docs/qa/screenshots/desktop-bce-1300.png" });
  await year(page, -1);
  await page.getByRole("button", { name: "后一年", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("1");
  await expect(page.locator(".header-year")).not.toContainText("公元前");
  await page.getByRole("button", { name: "前一年", exact: true }).click();
  await expect(page.locator(".header-year")).toContainText("公元前");
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(page.locator(".header-year")).not.toContainText("公元前");
  await page.getByRole("button", { name: "暂停播放", exact: true }).click();
  await year(page, 1120);
  for (const name of ["北宋", "辽", "西夏", "金"])
    await expect(
      page.locator(".entity-card").filter({ hasText: name }).first(),
    ).toBeVisible();
  await page
    .getByRole("combobox", { name: "时间轴显示时段" })
    .selectOption("all");
  await expect(page.getByRole("slider")).toHaveAttribute("min", "-2099");
  await page.getByRole("button", { name: "明", exact: true }).click();
  await expect(page.getByTestId("committed-year")).toHaveText("1368");
  await expect(page.getByRole("slider")).toHaveAttribute("min", "1368");
  await year(page, 1420);
  await page.locator(".source-plate-shortcut").click();
  await expect(page.getByRole("dialog")).toContainText("1580年");
  await expect(page.getByTestId("committed-year")).toHaveText("1420");
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await expect(page.locator(".event-glow")).toHaveCount(1);
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("紫禁城建成");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await year(page, 1912);
  await page.getByRole("button", { name: "本年事件", exact: true }).click();
  await expect(page.locator(".event-card")).toContainText("清帝退位");
  await expect(
    page.getByRole("button", { name: "后一年", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/qa/screenshots/desktop-qing-1912.png" });
  expect(errors).toEqual([]);
});

test("新增秦明清参考原图：年代范围、许可、缩放与手机布局", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  await page.getByRole("button", { name: "疆域图幅", exact: true }).click();
  for (const name of [
    "查阅公元前221—206年参考图",
    "查阅1580年参考图",
    "查阅1820年参考图",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("img")).toBeVisible();
    await expect
      .poll(() =>
        dialog
          .getByRole("img")
          .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
      )
      .toBe(true);
    const license = name.includes("221")
      ? ["CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"]
      : name.includes("1580")
        ? [
            "CC BY-SA 3.0 CZ",
            "https://creativecommons.org/licenses/by-sa/3.0/cz/",
          ]
        : ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"];
    await expect(
      dialog.getByRole("link", { name: license[0], exact: true }),
    ).toHaveAttribute("href", license[1]);
    await page.getByRole("button", { name: "放大图幅", exact: true }).click();
    await expect(page.getByRole("status", { name: "图幅比例" })).toHaveText(
      "150%",
    );
    await page
      .getByRole("button", { name: "关闭参考图幅", exact: true })
      .click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".browse-panel")).toBeHidden();
  await year(page, -221);
  await expect(page.locator(".header-year")).toContainText("公元前");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "docs/qa/screenshots/mobile-qin.png" });
});

test("742年东部唐疆域实际绘制，105度裁切限度清楚，播放与相邻年份同步", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("scene-status")).toHaveText("已更新");
  const canvas = page.locator(".map-canvas");
  const ids = "tang-742-eastern-administration";
  await page.getByRole("button", { name: "跳至742年疆域" }).click();
  await expectCuratedPaint(canvas, ids);
  await expect(page.locator(".coverage-banner")).toContainText("742年");
  await expect(page.locator(".coverage-banner")).not.toContainText("约742年");
  await expect(page.locator(".coverage-banner")).toContainText("仅105°E以东");
  const key = page.getByRole("region", { name: "当前地图疆域" });
  await key
    .getByRole("button", { name: /查看(?:隋|唐) · 行政设置来源/ })
    .click();
  const detail = page.getByRole("complementary", { name: "条目详情" });
  await expect(detail).toContainText("105°E");
  await expect(detail).toContainText("47.2公里");
  await expect(detail).toContainText("Yug");
  await page.getByRole("button", { name: "关闭详情" }).click();
  await page.screenshot({ path: "docs/qa/screenshots/distribution-742.png" });
  await year(page, 743);
  await expectCuratedPaint(canvas, "");
  await year(page, 741);
  await expectCuratedPaint(canvas, "");
  await page.getByRole("button", { name: "播放时间轴", exact: true }).click();
  await expectCuratedPaint(canvas, ids);
  await expect(
    page.getByRole("button", { name: "播放时间轴", exact: true }),
  ).toBeVisible();
  for (const width of [767, 390]) {
    await page.setViewportSize({ width, height: width === 767 ? 715 : 844 });
    await expectCuratedPaint(canvas, ids);
    await expect(page.locator(".browse-panel")).toBeHidden();
    const banner = await page.locator(".coverage-banner").boundingBox();
    const timeline = await page
      .getByRole("region", { name: "历史时间轴" })
      .boundingBox();
    expect(banner!.y + banner!.height).toBeLessThanOrEqual(timeline!.y);
    const caption = await page.locator(".map-caption").boundingBox();
    const polityKey = await key.boundingBox();
    expect(caption!.y + caption!.height).toBeLessThanOrEqual(polityKey!.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
  await page.screenshot({
    path: "docs/qa/screenshots/distribution-mobile-742.png",
  });
});

test("来源年份区间随时间轴切换：七雄、明、清，边界不延用过期范围", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator(".map-canvas");
  await year(page, -300);
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-375 clio-v021-434 clio-v021-447 clio-v021-448 clio-v021-483 clio-v021-513 clio-v021-514",
  );
  await expect(
    page.getByRole("region", { name: "当前地图疆域" }),
  ).toContainText("秦国");
  await year(page, 1420);
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-6396 clio-v021-6943 clio-v021-6963",
  );
  await page.getByRole("button", { name: "查看明 · 疆域复原来源" }).click();
  const detail = page.getByRole("complementary", { name: "条目详情" });
  await expect(detail).toContainText("1415—1421年");
  await expect(detail).toContainText("CC BY 4.0");
  await expect(detail).toContainText("非确日实控");
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await year(page, 1421);
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-6396 clio-v021-6943 clio-v021-6963",
  );
  await year(page, 1422);
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-6943/,
  );
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-/,
  );
  await year(page, 1820);
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-10503 clio-v021-11022 clio-v021-8854",
  );
  await expect(page.locator(".coverage-banner")).toContainText("非确日格局");
  await expect(page.locator(".coverage-banner")).toContainText(
    "德川幕府为部分岛屿复原",
  );
  await expect(page.locator(".coverage-banner")).not.toContainText("null年");
  await expect(page.locator(".coverage-banner")).not.toContainText(
    "西部未录入",
  );
  await page.locator(".filter-panel summary").click();
  await page.getByRole("checkbox", { name: "疆域复原", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-rendered-territory-ids", "");
  await page.getByRole("checkbox", { name: "疆域复原", exact: true }).click();
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-10503 clio-v021-11022 clio-v021-8854",
  );
});

test("742年同时保留周边政权，显式来源选择可查完整研究轮廓", async ({
  page,
}) => {
  await page.goto("/");
  await year(page, 742);
  const canvas = page.locator(".map-canvas");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-2590 clio-v021-2659 clio-v021-2720 clio-v021-2729 clio-v021-2753 tang-742-eastern-administration",
  );
  await page.locator(".filter-panel summary").click();
  await page
    .getByRole("combobox", { name: "史料解释版本" })
    .selectOption("cliopatria-v021-reviewed");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-2590 clio-v021-2642 clio-v021-2659 clio-v021-2720 clio-v021-2729 clio-v021-2753",
  );
  await page.getByRole("combobox", { name: "史料解释版本" }).selectOption("");
  await expectCuratedPaint(canvas, "tang-742-eastern-administration");
  await year(page, 743);
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    "clio-v021-2590 clio-v021-2642 clio-v021-2659 clio-v021-2720 clio-v021-2729 clio-v021-2753",
  );
});

test("遗址事件点优先于疆域填色响应点击，邻国有范围时仍显示东晋缺口", async ({
  page,
}) => {
  await page.goto("/");
  for (const [n, title] of [
    [229, "孙权在武昌称帝"],
    [317, "东晋政权建立"],
    [794, "迁都平安京"],
    [690, "武则天改国号周"],
    [700, "武则天金简纪年"],
    [705, "唐中宗复位，恢复唐国号"],
  ] as const) {
    await year(page, n);
    await page.locator(".event-glow").click();
    const detail = page.getByRole("complementary", { name: "条目详情" });
    await expect(detail).toContainText(title);
    await expect(detail).toContainText("地区参考");
    await expect
      .poll(async () => {
        const marker = await page.locator(".event-glow").boundingBox();
        const canvas = await page.locator(".map-canvas").boundingBox();
        return (
          !!marker &&
          !!canvas &&
          marker.x >= canvas.x &&
          marker.x + marker.width <= canvas.x + canvas.width &&
          marker.y >= canvas.y &&
          marker.y + marker.height <= canvas.y + canvas.height
        );
      })
      .toBe(true);
    await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  }
  for (const [n, title] of [
    [634, "大明宫"],
    [652, "大雁塔"],
  ] as const) {
    await year(page, n);
    await page.locator(".event-glow").click();
    const detail = page.getByRole("complementary", { name: "条目详情" });
    await expect(detail).toContainText(title);
    await expect(detail).toContainText("遗址附近");
    await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  }
  await year(page, 384);
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-/,
  );
  await expect(page.getByTestId("map-coverage-gap")).toContainText("东晋");
  await page
    .getByRole("button", { name: "查看本年疆域缺口", exact: true })
    .click();
  await expect(page.getByTestId("missing-polities")).toContainText("东晋");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await year(page, 1000);
  await expect(
    page.getByRole("button", {
      name: "查看大理国 · 疆域复原来源",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-3931/,
  );
  await year(page, 1095);
  await expect(page.getByTestId("map-coverage-gap")).toContainText("大中国");
  await expect(page.locator(".map-canvas")).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /clio-v021-(3931|4490)/,
  );
  await page
    .getByRole("button", { name: "查看本年疆域缺口", exact: true })
    .click();
  await expect(page.getByTestId("missing-polities")).toContainText("大中国");
});

test("逐年清单区分东晋部分图幅与缺失年份，跳转实时换图且不沿用", async ({
  page,
}) => {
  await page.goto("/");
  await year(page, 383);
  const canvas = page.locator(".map-canvas");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /jin-383-partial-reconstruction/,
  );
  await expectCuratedPaint(canvas, "jin-383-partial-reconstruction");
  await expect(page.locator(".coverage-banner")).toContainText(
    "东晋仅录入原图部分图幅",
  );
  await page.locator(".event-glow").click();
  await expect(
    page.getByRole("complementary", { name: "条目详情" }),
  ).toContainText("淝水之战");
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("东晋");
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "仅部分图幅 3 年 · 尚无范围 101 年",
  );
  await page
    .getByRole("button", { name: "384—408年 尚无范围", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("384");
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /jin-383/,
  );
  await expect(page.getByTestId("missing-polities")).toContainText("东晋");
  await page
    .getByRole("button", { name: "409年 仅部分图幅", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("409");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /jin-409-partial-reconstruction/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "逐年覆盖政权阶段" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "327年 仅部分图幅", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("327");
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /jin-327-partial-reconstruction/,
  );
});

test("逐年缺口新增西晋、汉赵、后赵、北燕范围只在来源年份绘制，原图可查看", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  const canvas = page.locator(".map-canvas");
  for (const [n, ids] of [
    [280, ["jin-280-gap-reconstruction"]],
    [
      327,
      ["han-zhao-327-gap-reconstruction", "later-zhao-327-gap-reconstruction"],
    ],
    [409, ["northern-yan-409-gap-reconstruction"]],
  ] as const) {
    await year(page, n);
    await expectCuratedPaint(
      canvas,
      [
        ...ids,
        ...(n === 327
          ? ["jin-327-partial-reconstruction"]
          : n === 409
            ? [
                "jin-409-partial-reconstruction",
                "xia-409-partial-reconstruction",
              ]
            : []),
      ].join(" "),
    );
    await year(page, n + 1);
    for (const id of ids)
      await expect(canvas).not.toHaveAttribute(
        "data-rendered-territory-ids",
        new RegExp(id),
      );
  }
  await year(page, 280);
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("西晋");
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "有范围资料 30 年 · 仅部分图幅 1 年 · 尚无范围 21 年",
  );
  await page
    .getByRole("button", { name: "280年 仅部分图幅", exact: true })
    .click();
  await expectCuratedPaint(canvas, "jin-280-gap-reconstruction");
  await page.getByRole("button", { name: /查阅280年来源原图/ }).click();
  await expect(page.locator(".plate-viewer img")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("CC BY-SA 4.0");
  await expect(page.getByRole("dialog")).toContainText("图幅外仍缺");
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await page
    .getByRole("button", { name: "281—282年 尚无范围", exact: true })
    .click();
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /jin-280-gap-reconstruction/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page.getByRole("textbox", { name: "查找逐年覆盖政权" }).fill("北燕");
  await page
    .getByRole("button", { name: "409—425年 有范围资料", exact: true })
    .click();
  await expectCuratedPaint(
    canvas,
    "northern-yan-409-gap-reconstruction jin-409-partial-reconstruction xia-409-partial-reconstruction",
  );
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "有范围资料 17 年 · 仅部分图幅 0 年 · 尚无范围 11 年",
  );
  await expect(page.getByTestId("missing-polities")).toContainText("西秦");
});

test("409年夏部分范围与逐年清单同步，手机查阅原图且邻年不延用", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator(".map-canvas");
  await year(page, 409);
  await expectCuratedPaint(
    canvas,
    "northern-yan-409-gap-reconstruction jin-409-partial-reconstruction xia-409-partial-reconstruction",
  );
  await expect(
    page.getByRole("button", { name: /查看夏（赫连氏）.*来源/ }),
  ).toContainText("部分范围");
  await page.getByRole("button", { name: "资料覆盖", exact: true }).click();
  await page
    .getByRole("textbox", { name: "查找逐年覆盖政权" })
    .fill("夏（赫连氏）");
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "有范围资料 16 年 · 仅部分图幅 1 年 · 尚无范围 8 年",
  );
  await page
    .getByRole("button", { name: "407—408年 尚无范围", exact: true })
    .click();
  await expect(page.getByTestId("committed-year")).toHaveText("407");
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /xia-409-partial-reconstruction/,
  );
  await page
    .getByRole("button", { name: "409年 仅部分图幅", exact: true })
    .click();
  await expect(canvas).toHaveAttribute(
    "data-rendered-territory-ids",
    /xia-409-partial-reconstruction/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "条目 · 搜索 · 图层", exact: true })
    .click();
  await expect(page.getByTestId("annual-coverage-summary")).toContainText(
    "尚无范围 8 年",
  );
  await page.getByRole("button", { name: "关闭浏览", exact: true }).click();
  await page.getByRole("button", { name: /查阅409年来源原图/ }).click();
  await expect(page.getByRole("dialog")).toContainText("12像素");
  await expect(page.getByRole("dialog")).toContainText("CC BY-SA 4.0");
  await page.getByRole("button", { name: "关闭参考图幅", exact: true }).click();
  await year(page, 410);
  await expect(canvas).not.toHaveAttribute(
    "data-rendered-territory-ids",
    /xia-409-partial-reconstruction/,
  );
});
