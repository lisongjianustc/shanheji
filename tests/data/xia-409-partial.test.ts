import { readDataset } from "../../scripts/data/validate";
import { defaultQuery, queryScene } from "../../src/domain/query";
import { buildAnnualCoverage } from "../../src/domain/annualCoverage";
import { buildTerritorySlices } from "../../src/domain/territorySlices";
import defaults from "../../data/catalog/default-interpretations.json";
import type { Catalog, DataPackage } from "../../src/domain/types";

let catalog: Catalog, packs: DataPackage[];
beforeAll(async () => ({ catalog, packs } = await readDataset("data")));
const id = "xia-409-partial-reconstruction";

it("changes Xia 409 from missing to partial while preserving other gaps", () => {
  const scene = queryScene(catalog, packs, defaultQuery(409), defaults);
  const feature = scene.territories.find((t) => t.properties.id === id)!;
  expect(feature.properties.compilation.extent).toBe("partial-source");
  expect(feature.properties.compilation.boundaryGeometry?.type).toBe(
    "MultiLineString",
  );
  const slices = buildTerritorySlices(packs.flatMap((p) => p.territories));
  const row = buildAnnualCoverage(
    catalog,
    slices,
    scene.query.filters,
    defaults,
  ).find((r) => r.id === "xia/407")!;
  expect([row.availableYears, row.partialYears, row.missingYears]).toEqual([
    16, 1, 8,
  ]);
  expect(
    row.spans.find((s) => s.startYear <= 409 && s.endYear >= 409)?.status,
  ).toBe("partial");
  expect(
    scene.territories.some((t) => t.properties.entityId === "western-qin"),
  ).toBe(false);
});

it.each([407, 408, 410, 426, 431])(
  "does not carry the source footprint to %i",
  (year) => {
    expect(
      queryScene(catalog, packs, defaultQuery(year), defaults).territories.some(
        (t) => t.properties.id === id,
      ),
    ).toBe(false);
  },
);

it("excludes the annual snapshot from exact-day queries", () => {
  const query = defaultQuery(409);
  query.at = "0409-07-01";
  expect(
    queryScene(catalog, packs, query, defaults).territories.some(
      (t) => t.properties.id === id,
    ),
  ).toBe(false);
});

it("removes the source and restores its gap when that interpretation is filtered", () => {
  const query = defaultQuery(409);
  query.filters.interpretationIds = defaults.filter(
    (v) => v !== "zunkir-xia-409-partial",
  );
  expect(
    queryScene(catalog, packs, query, defaults).territories.some(
      (t) => t.properties.entityId === "xia",
    ),
  ).toBe(false);
});
