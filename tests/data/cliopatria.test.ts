import { readDataset, validateDataset } from "../../scripts/data/validate";
import { queryScene, defaultQuery } from "../../src/domain/query";
import defaults from "../../data/catalog/default-interpretations.json";
import { lastYear, yearOf } from "../../src/domain/time";
import {
  buildTerritorySlices,
  territoryAvailabilityYears,
} from "../../src/domain/territorySlices";
import { missingPolities } from "../../src/features/coverage/CoveragePanel";
import type { Catalog, DataPackage } from "../../src/domain/types";
let catalog: Catalog, packs: DataPackage[];
beforeAll(async () => ({ catalog, packs } = await readDataset("data")));
const ids = (year: number) =>
  queryScene(catalog, packs, defaultQuery(year), defaults).territories.map(
    (t) => t.properties.id,
  );
it.each([
  [-218, "clio-v021-731"],
  [14, "clio-v021-1126"],
  [1120, "clio-v021-4444"],
  [1420, "clio-v021-6943"],
  [1820, "clio-v021-11022"],
] as const)("displays the dated research source at %i", (year, id) => {
  expect(ids(year)).toContain(id);
  expect(
    queryScene(catalog, packs, defaultQuery(year), defaults).territories.find(
      (t) => t.properties.id === id,
    )!.properties.relation,
  ).toBe("reconstruction");
});
it("does not repeat a frame beyond its source interval or use annual data for exact dates", () => {
  expect(ids(-208)).not.toContain("clio-v021-756");
  expect(ids(1422)).not.toContain("clio-v021-6943");
  expect(
    queryScene(
      catalog,
      packs,
      { ...defaultQuery(1420), at: "1420-06-01" },
      defaults,
    ).territories,
  ).toHaveLength(0);
  for (const year of [1126, 1127, 1138])
    expect(ids(year)).not.toContain("clio-v021-4833");
  expect(
    packs
      .flatMap((p) => p.territories)
      .some((t) => t.properties.id === "clio-v021-1376"),
  ).toBe(false);
});
it("prefers the single-year source for the same polity and allows explicit reconstruction selection", () => {
  expect(ids(742)).toContain("tang-742-eastern-administration");
  expect(ids(742)).not.toContain("clio-v021-2642");
  const q = defaultQuery(742);
  q.filters.interpretationIds = ["cliopatria-v021-reviewed"];
  const chosen = queryScene(catalog, packs, q, defaults).territories.map(
    (t) => t.properties.id,
  );
  expect(chosen).toContain("clio-v021-2642");
  expect(chosen).not.toContain("tang-742-eastern-administration");
  expect(ids(743)).toContain("clio-v021-2642");
  expect(ids(743)).not.toContain("tang-742-eastern-administration");
});
it("retains source interval endpoints in the navigation index and deduplicates overlapping packages", () => {
  const fs = packs.flatMap((p) => p.territories);
  expect(validateDataset(catalog, packs)).toEqual([]);
  const row = buildTerritorySlices(fs).find(
    (r) => r.entityId === "ming" && r.year === 1415,
  );
  expect(row?.endYear).toBe(1421);
  expect(row?.featureCount).toBe(1);
  expect(territoryAvailabilityYears([row!])).toEqual([1415, 1422]);
  const seen = new Set<string>();
  for (const t of fs.filter(
    (t) => t.properties.relation === "reconstruction",
  )) {
    if (seen.has(t.properties.id)) continue;
    seen.add(t.properties.id);
    const e = catalog.entities.find((e) => e.id === t.properties.entityId)!;
    const a = yearOf(t.properties.validity.start.earliest),
      b = lastYear(t.properties.validity);
    expect(
      (e.activePeriods ?? [e.existence]).some(
        (v) => yearOf(v.start.earliest) <= a && lastYear(v) >= b,
      ),
    ).toBe(true);
    expect(t.properties.validity.precision).toBe("year");
  }
  expect(seen.size).toBe(554);
});
it("keeps Dali's supported early intervals separate from Dazhong and Mongol administration", () => {
  for (const year of [950, 1000, 1055]) {
    expect(
      queryScene(catalog, packs, defaultQuery(year), defaults).territories.some(
        (t) => t.properties.entityId === "dali",
      ),
    ).toBe(true);
  }
  for (const year of [1056, 1094, 1095, 1096, 1253, 1254]) {
    const s = queryScene(catalog, packs, defaultQuery(year), defaults);
    expect(s.territories.some((t) => t.properties.entityId === "dali")).toBe(
      false,
    );
    if (year === 1095)
      expect(missingPolities(s).map((e) => e.id)).toContain("dazhong");
    if (year === 1096)
      expect(s.events.some((e) => e.id === "dali-restored")).toBe(true);
  }
});
it("reports a missing Eastern Jin outline even when its northern neighbors are drawn", () => {
  const scene = queryScene(catalog, packs, defaultQuery(383), defaults);
  expect(scene.territories.length).toBeGreaterThan(0);
  expect(missingPolities(scene).map((e) => e.id)).toContain("jin");
  const q = defaultQuery(1820);
  q.filters.entityIds = ["qing"];
  expect(missingPolities(queryScene(catalog, packs, q, defaults))).toHaveLength(
    0,
  );
  q.filters.relations = ["control"];
  expect(
    missingPolities(queryScene(catalog, packs, q, defaults)).map((e) => e.id),
  ).toEqual(["qing"]);
});
it.each([
  [1200, ["goryeo", "kamakura"]],
  [1420, ["joseon", "ashikaga"]],
  [1820, ["joseon", "tokugawa"]],
  [1900, ["korean-empire"]],
] as const)(
  "keeps later neighbors alongside Chinese polities at %i",
  (year, entities) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    expect(scene.territories.map((t) => t.properties.entityId)).toEqual(
      expect.arrayContaining([...entities]),
    );
  },
);
it("does not publish Tokugawa's outlying component claims or extend the shogunate past its phase", () => {
  const row = queryScene(
    catalog,
    packs,
    defaultQuery(1820),
    defaults,
  ).territories.find((t) => t.properties.entityId === "tokugawa")!;
  expect(row.properties.compilation.extent).toBe("partial-source");
  expect(row.properties.compilation.extentNote).toContain("未录入");
  const coordinates =
    row.geometry.type === "Polygon"
      ? row.geometry.coordinates.flat()
      : row.geometry.coordinates.flat(2);
  expect(coordinates.every((c) => c[1] >= 30 && c[1] <= 41.6)).toBe(true);
  expect(row.properties.compilation.boundaryGeometry).toBeDefined();
  for (const year of [1600, 1602, 1868, 1869])
    expect(
      queryScene(catalog, packs, defaultQuery(year), defaults).territories.some(
        (t) => t.properties.entityId === "tokugawa",
      ),
    ).toBe(false);
});
