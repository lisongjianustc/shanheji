import { readDataset } from "../../scripts/data/validate";
import { defaultQuery, queryScene } from "../../src/domain/query";
import { buildAnnualCoverage } from "../../src/domain/annualCoverage";
import { buildTerritorySlices } from "../../src/domain/territorySlices";
import defaults from "../../data/catalog/default-interpretations.json";
import type { Catalog, DataPackage } from "../../src/domain/types";
let catalog: Catalog, packs: DataPackage[];
beforeAll(async () => ({ catalog, packs } = await readDataset("data")));
const version = "zunkir-jin-gap-snapshots";
it.each([
  [280, "jin", "jin/265", 30, 1, 21],
  [327, "han-zhao", "han-zhao/304", 19, 0, 7],
  [327, "later-zhao", "later-zhao/319", 11, 0, 21],
  [409, "northern-yan", "northern-yan/409", 17, 0, 11],
] as const)(
  "adds only the sourced year %i for %s and changes its actual annual gap",
  (year, entity, phase, available, partial, missing) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    const added = scene.territories.filter(
      (t) =>
        t.properties.entityId === entity &&
        t.properties.interpretationId === version,
    );
    expect(added).toHaveLength(1);
    expect(added[0].properties.id).toBe(`${entity}-${year}-gap-reconstruction`);
    for (const n of [year - 1, year + 1])
      expect(
        queryScene(catalog, packs, defaultQuery(n), defaults).territories.some(
          (t) => t.properties.id === added[0].properties.id,
        ),
      ).toBe(false);
    const exact = defaultQuery(year);
    exact.at = `${year.toString().padStart(4, "0")}-07-01`;
    expect(
      queryScene(catalog, packs, exact, defaults).territories.some(
        (t) => t.properties.id === added[0].properties.id,
      ),
    ).toBe(false);
    const slices = buildTerritorySlices(packs.flatMap((p) => p.territories));
    const row = buildAnnualCoverage(
      catalog,
      slices,
      scene.query.filters,
      defaults,
    ).find((r) => r.id === phase)!;
    expect([row.availableYears, row.partialYears, row.missingYears]).toEqual([
      available,
      partial,
      missing,
    ]);
    const before = defaultQuery(year);
    before.filters.interpretationIds = defaults.filter((id) => id !== version);
    const previous = buildAnnualCoverage(
      catalog,
      slices,
      before.filters,
      defaults,
    ).find((r) => r.id === phase)!;
    expect(previous.missingYears).toBe(missing + 1);
    expect(
      queryScene(catalog, packs, before, defaults).territories.some(
        (t) => t.properties.entityId === entity,
      ),
    ).toBe(false);
  },
);
it("keeps 409 Western Qin and the other Jin gap years unresolved", () => {
  expect(
    queryScene(catalog, packs, defaultQuery(409), defaults).territories.some(
      (t) => t.properties.entityId === "western-qin",
    ),
  ).toBe(false);
  for (const year of [265, 279, 281, 282, 313, 316])
    expect(
      queryScene(catalog, packs, defaultQuery(year), defaults).territories.some(
        (t) => t.properties.entityId === "jin",
      ),
    ).toBe(false);
});
