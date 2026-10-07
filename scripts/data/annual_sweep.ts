import { readFile, writeFile } from "node:fs/promises";
import { readDataset, validateDataset } from "./validate";
import { buildTerritorySlices } from "../../src/domain/territorySlices";
import { buildAnnualCoverage } from "../../src/domain/annualCoverage";
import { queryScene, defaultQuery } from "../../src/domain/query";
import {
  MIN_YEAR,
  MAX_YEAR,
  nextYear,
  formatYearRange,
} from "../../src/domain/chronology";
const { catalog, packs } = await readDataset("data");
const issues = validateDataset(catalog, packs);
if (issues.length) throw new Error(JSON.stringify(issues));
const defaults: string[] = JSON.parse(
  await readFile("data/catalog/default-interpretations.json", "utf8"),
);
const features = [
  ...new Map(
    packs.flatMap((p) => p.territories).map((f) => [f.properties.id, f]),
  ).values(),
];
const slices = buildTerritorySlices(features);
const rows = buildAnnualCoverage(
  catalog,
  slices,
  defaultQuery().filters,
  defaults,
);
// Avoid repeated JSON comparison of identical cross-pack geometry copies.
// Run the actual production query against the same deduplicated geometry.
const single = [
  {
    id: "annual-audit",
    version: "audit",
    territories: features,
    events: [],
    coverage: [],
  },
];
let checkedYears = 0,
  yearsWithGeometry = 0,
  yearsWithoutGeometry = 0;
const yearly = [];
for (let year = MIN_YEAR; year <= MAX_YEAR; year = nextYear(year)) {
  const scene = queryScene(catalog, single, defaultQuery(year), defaults);
  const expected = rows.filter((r) => r.startYear <= year && year <= r.endYear);
  const drawn = new Set(scene.territories.map((t) => t.properties.entityId));
  for (const row of expected) {
    const status = row.spans.find(
      (s) => s.startYear <= year && year <= s.endYear,
    )!.status;
    const actual = scene.territories.filter(
      (t) => t.properties.entityId === row.entityId,
    );
    const actualStatus = !actual.length
      ? "missing"
      : actual.every(
            (t) => t.properties.compilation.extent === "partial-source",
          )
        ? "partial"
        : "available";
    if (status !== actualStatus)
      throw new Error(
        `Annual index/query mismatch ${year}: ${row.entityId} ${status}/${actualStatus}`,
      );
  }
  for (const t of scene.territories) {
    if (!expected.some((r) => r.entityId === t.properties.entityId))
      throw new Error(
        `Range outside registered phase: ${year}/${t.properties.id}`,
      );
    if (
      t.properties.temporalSupport === "snapshot" &&
      t.properties.snapshotYear !== year
    )
      throw new Error(
        `Snapshot carried into unsupported year: ${year}/${t.properties.id}`,
      );
  }
  checkedYears++;
  if (drawn.size) yearsWithGeometry++;
  else yearsWithoutGeometry++;
  yearly.push({
    year,
    territoryCount: scene.territories.length,
    polityCount: drawn.size,
    partialPolityCount: expected.filter((r) =>
      r.spans.some(
        (s) =>
          s.status === "partial" && s.startYear <= year && year <= s.endYear,
      ),
    ).length,
    missingPolityCount: expected.filter((r) => !drawn.has(r.entityId)).length,
  });
}
const result = {
  checkedAt: process.argv.includes("--checked-at")
    ? process.argv[process.argv.indexOf("--checked-at") + 1]
    : new Date().toISOString().slice(0, 10),
  meaning:
    "4012年逐年调用正式查询，与页面资料清单逐项核对；资料存在性测试，不证明历史疆界完整或准确。仅覆盖已登记政权，未把相邻快照延用。",
  checkedYears,
  yearsWithGeometry,
  yearsWithoutGeometry,
  registeredPhases: rows.length,
  uniqueTerritories: features.length,
  rows,
  yearly,
};
await writeFile(
  "data/audits/annual-query-sweep.json",
  JSON.stringify(result, null, 2) + "\n",
);
const labels = {
  available: "有范围资料",
  partial: "仅部分图幅",
  missing: "尚无范围",
};
const md = [
  "# 逐年查询与资料清单核对",
  "",
  result.meaning,
  "",
  `- 逐年查询：${checkedYears} 年（公元前2100年至1912年，不含0年）。`,
  `- 有任一已录入范围：${yearsWithGeometry} 年；全图无范围资料：${yearsWithoutGeometry} 年。`,
  "- 有范围仍可能存在未登记政权、地区缺口、争议和年份精度限制；不能称为完整逐年疆界。",
  "",
  "| 名称阶段 | 已登记年份 | 有范围资料 | 仅部分图幅 | 尚无范围 | 区间详情 |",
  "| --- | --- | ---: | ---: | ---: | --- |",
  ...rows.map(
    (r) =>
      `| ${r.name} | ${formatYearRange(r.startYear, r.endYear)} | ${r.availableYears} | ${r.partialYears} | ${r.missingYears} | ${r.spans.map((s) => `${formatYearRange(s.startYear, s.endYear)} ${labels[s.status]}`).join("；")} |`,
  ),
];
await writeFile("docs/data/annual-query-sweep.md", md.join("\n") + "\n");
console.log(
  JSON.stringify({
    checkedYears,
    yearsWithGeometry,
    yearsWithoutGeometry,
    registeredPhases: rows.length,
    uniqueTerritories: features.length,
  }),
);
