import { readDataset, validateDataset } from "../../scripts/data/validate";
import { queryScene, defaultQuery } from "../../src/domain/query";
import { buildEventLocations } from "../../src/features/details/eventModel";
import { entityActiveInYear, nameAt } from "../../src/domain/time";
import {
  buildSearchIndex,
  searchEntries,
} from "../../src/features/search/index";
import { catalogSchema, packageSchema } from "../../src/domain/schema";
import defaults from "../../data/catalog/default-interpretations.json";
import plates from "../../data/catalog/map-plates.json";
import { resolve } from "node:path";
import type { Catalog, DataPackage } from "../../src/domain/types";
let catalog: Catalog, packs: DataPackage[];
beforeAll(
  async () => ({ catalog, packs } = await readDataset(resolve("data"))),
);
it.each([
  [866, "qocho-founded-866", [89.17886, 42.94769]],
  [1028, "ganzhou-falls-1028", [100.45167, 38.93417]],
  [1209, "qocho-submits-1209", [89.17886, 42.94769]],
] as const)(
  "uses the reviewed modern regional reference for an oasis event at %i",
  (year, id, coordinates) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    const point = buildEventLocations(scene).features.features.find(
      (f) => f.properties.eventId === id,
    )!;
    expect(point.geometry.coordinates).toEqual([...coordinates]);
    expect(point.properties.approximate).toBe(true);
    expect(scene.events.find((e) => e.id === id)?.interpretation).toContain(
      "确点",
    );
    expect(
      queryScene(catalog, packs, defaultQuery(year + 1), defaults).events.some(
        (e) => e.id === id,
      ),
    ).toBe(false);
  },
);
it("retains Qocho after Mongol submission and preserves Ganzhou's uncertain beginning", () => {
  const qocho = catalog.entities.find((e) => e.id === "qocho-uyghur")!;
  expect(entityActiveInYear(qocho, 1209)).toBe(true);
  expect(entityActiveInYear(qocho, 1283)).toBe(true);
  expect(entityActiveInYear(qocho, 1284)).toBe(false);
  expect(qocho.existence.label).toContain("本土阶段");
  const gan = catalog.entities.find((e) => e.id === "ganzhou-uyghur")!;
  expect(gan.existence.start).toEqual({
    earliest: "0848-01-01",
    latest: "0872-12-31",
  });
  expect(entityActiveInYear(gan, 1029)).toBe(false);
});
it("publishes the new chronology with complete references and retains old territories", () => {
  expect(validateDataset(catalog, packs)).toEqual([]);
  expect(catalogSchema.safeParse(catalog).success).toBe(true);
  expect(packs.every((p) => packageSchema.safeParse(p).success)).toBe(true);
  expect(
    packs
      .flatMap((p) => p.territories)
      .filter((t) => !t.properties.id.startsWith("clio-")),
  ).toHaveLength(19);
});
it("keeps the 376 Eastern Jin plate as an unregistered source reference", () => {
  const plate = plates.find((p) => p.id === "eastern-jin-376")!;
  expect(plate.year).toBe(376);
  expect(plate.license).toBe("CC BY 3.0");
  expect(plate.limitations).toContain("尚未完成可靠配准");
  expect(plate.entityIds).toContain("jin");
  expect(
    queryScene(catalog, packs, defaultQuery(376), defaults).territories.some(
      (t) => t.properties.entityId === "jin",
    ),
  ).toBe(false);
});
it.each([
  -2100, -1600, -1046, -770, -221, -206, -1, 1, 9, 25, 960, 1127, 1271, 1368,
  1644, 1912,
])(
  "queries supported year %i without borrowing a neighboring boundary",
  (year) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    expect(scene.query.year).toBe(year);
    expect(
      scene.territories.filter((t) => !t.properties.id.startsWith("clio-")),
    ).toHaveLength(0);
    expect(scene.coverage.length).toBeGreaterThan(0);
  },
);
it("uses BCE location validity for a real Shang event point", () => {
  const scene = queryScene(catalog, packs, defaultQuery(-1300), defaults);
  expect(scene.events.some((e) => e.id === "yin-capital")).toBe(true);
  expect(
    buildEventLocations(scene).features.features.some(
      (f) => f.properties.eventId === "yin-capital",
    ),
  ).toBe(true);
  expect(
    queryScene(catalog, packs, defaultQuery(-1045), defaults).events.some(
      (e) => e.id === "yin-capital",
    ),
  ).toBe(false);
});
it("locates Fei River's regional reference without claiming a precise battlefield", () => {
  const scene = queryScene(catalog, packs, defaultQuery(383), defaults);
  const point = buildEventLocations(scene).features.features.find(
    (f) => f.properties.eventId === "fei-383",
  )!;
  expect(point.geometry.coordinates).toEqual([116.79291, 32.58162]);
  expect(point.properties.approximate).toBe(true);
  expect(
    scene.events.find((e) => e.id === "fei-383")?.interpretation,
  ).toContain("非古战场确点");
});
it.each([
  [690, "wu-zhou-founded", [112.43684, 34.67345]],
  [700, "wu-gold-slip", [113.03194, 34.45549]],
  [705, "tang-restored", [112.43684, 34.67345]],
] as const)(
  "locates Wu Zhou's annual records without assigning invented borders at %i",
  (year, id, coordinates) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    const event = scene.events.find((e) => e.id === id)!;
    expect(event).toBeDefined();
    expect(event.validity.precision).toBe("year");
    const point = buildEventLocations(scene).features.features.find(
      (f) => f.properties.eventId === id,
    )!;
    expect(point.geometry.coordinates).toEqual([...coordinates]);
    expect(point.properties.approximate).toBe(true);
    expect(event.interpretation).toContain("地区参考");
    expect(event.interpretation).toContain("非");
    expect(
      scene.territories.some((t) => t.properties.entityId === "wu-zhou"),
    ).toBe(false);
    expect(
      queryScene(catalog, packs, defaultQuery(year + 1), defaults).events.some(
        (e) => e.id === id,
      ),
    ).toBe(false);
  },
);
it.each([
  [907, "qi-court-907"],
  [924, "qi-submits-924"],
] as const)(
  "locates Qi's regional records without inventing a palace or extending the source territory at %i",
  (year, id) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    const point = buildEventLocations(scene).features.features.find(
      (f) => f.properties.eventId === id,
    )!;
    expect(point.geometry.coordinates).toEqual([107.39127, 34.52301]);
    expect(point.properties.approximate).toBe(true);
    expect(scene.events.find((e) => e.id === id)?.interpretation).toContain(
      "非古岐王府",
    );
    expect(
      scene.territories.some((t) => t.properties.entityId === "qi-five"),
    ).toBe(false);
    expect(
      queryScene(catalog, packs, defaultQuery(year + 1), defaults).events.some(
        (e) => e.id === id,
      ),
    ).toBe(false);
  },
);
it("keeps Northern Wei Luoyang separate from the modern city reference used for Wu Zhou", () => {
  const scene = queryScene(catalog, packs, defaultQuery(494), defaults);
  const point = buildEventLocations(scene).features.features.find(
    (f) => f.properties.eventId === "luoyang-494",
  )!;
  expect(point.geometry.coordinates).toEqual([112.621389, 34.731111]);
  expect(
    queryScene(catalog, packs, defaultQuery(701), defaults).events.some(
      (e) => e.id === "wu-gold-slip",
    ),
  ).toBe(false);
});
it.each([
  [229, "wu-emperor-229", [114.83333, 30.4]],
  [317, "eastern-jin-317", [118.77778, 32.06167]],
  [794, "heian-794", [135.75385, 35.02107]],
] as const)(
  "uses a verified modern regional point without claiming an ancient palace at %i",
  (year, id, coordinates) => {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    const point = buildEventLocations(scene).features.features.find(
      (f) => f.properties.eventId === id,
    )!;
    expect(point.geometry.coordinates).toEqual([...coordinates]);
    expect(point.properties.approximate).toBe(true);
    expect(scene.events.find((e) => e.id === id)?.interpretation).toContain(
      "地区参考",
    );
    expect(scene.events.find((e) => e.id === id)?.interpretation).toMatch(
      /(非|不是).*确点/,
    );
  },
);
it.each([
  [494, "luoyang-494"],
  [634, "daming-founded"],
  [652, "wild-goose-founded"],
  [896, "daming-destroyed"],
])("cultural points retain evidence and can be located at %i", (year, id) => {
  const scene = queryScene(
    catalog,
    packs,
    defaultQuery(Number(year)),
    defaults,
  );
  const points = buildEventLocations(scene).features.features;
  expect(points.some((f) => f.properties.eventId === id)).toBe(true);
});
it("includes simultaneous Song Liao and Jin rather than replacing them with one dynasty", () => {
  const active = catalog.entities
    .filter((e) => entityActiveInYear(e, 1120))
    .map((e) => e.id);
  expect(active).toEqual(
    expect.arrayContaining([
      "northern-song",
      "liao",
      "western-xia",
      "jurchen-jin",
    ]),
  );
});
it("keeps names and Qing abdication aligned to their dates", () => {
  expect(
    nameAt(catalog.entities.find((e) => e.id === "mongol-yuan")!.names, 1206),
  ).toBe("蒙古政权");
  expect(
    nameAt(catalog.entities.find((e) => e.id === "mongol-yuan")!.names, 1271),
  ).toBe("元");
  expect(
    nameAt(catalog.entities.find((e) => e.id === "qing")!.names, 1620),
  ).toBe("后金");
  expect(
    nameAt(catalog.entities.find((e) => e.id === "qing")!.names, 1644),
  ).toBe("清");
  expect(
    queryScene(
      catalog,
      packs,
      { ...defaultQuery(1912), at: "1912-02-12" },
      defaults,
    ).events.some((e) => e.id === "qing-abdication"),
  ).toBe(true);
});
it("searches new dynasties over the full period and refuses year zero", () => {
  const index = buildSearchIndex(
    catalog,
    packs.flatMap((p) => p.events),
  );
  expect(
    searchEntries(index, "秦朝", 661).some(
      (e) => e.id === "qin" && e.startYear === -221,
    ),
  ).toBe(true);
  expect(searchEntries(index, "清", 661).some((e) => e.id === "qing")).toBe(
    true,
  );
  expect(() => queryScene(catalog, packs, defaultQuery(0))).toThrow();
  expect(() => queryScene(catalog, packs, defaultQuery(-2101))).toThrow();
});
