import { readDataset } from "../../scripts/data/validate";
import { queryScene, defaultQuery } from "../../src/domain/query";
import defaults from "../../data/catalog/default-interpretations.json";
it("shows every dated polity under default filters and clears unsupported adjacent years", async () => {
  const { catalog, packs } = await readDataset("data");
  for (const [year, entities] of [
    [262, ["cao-wei", "shu-han", "sun-wu"]],
    [572, ["northern-zhou", "northern-qi", "chen", "western-liang-nanbei"]],
    [610, ["sui"]],
    [661, ["tang", "tang"]],
  ] as const) {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    expect(scene.territories.map((t) => t.properties.entityId).sort()).toEqual(
      [...entities].sort(),
    );
    expect(
      scene.territories.every(
        (t) => t.properties.relation === "administration",
      ),
    ).toBe(true);
    expect(
      queryScene(catalog, packs, defaultQuery(year + 1), defaults).territories,
    ).toHaveLength(0);
  }
  // A year-only plate cannot claim the boundaries of an exact calendar day.
  expect(
    queryScene(
      catalog,
      packs,
      { ...defaultQuery(262), at: "0262-06-01" },
      defaults,
    ).territories,
  ).toHaveLength(0);
  expect(
    queryScene(
      catalog,
      packs,
      { ...defaultQuery(610), at: "0610-06-01" },
      defaults,
    ).territories,
  ).toHaveLength(0);
  expect(
    queryScene(catalog, packs, defaultQuery(609), defaults).territories,
  ).toHaveLength(0);
  expect(
    queryScene(catalog, packs, defaultQuery(610), defaults).territories[0]
      .properties.compilation.extent,
  ).toBe("partial-source");
  const q = defaultQuery(262);
  q.filters.regionIds = ["korea"];
  expect(
    queryScene(catalog, packs, q, defaults).territories.map(
      (t) => t.properties.entityId,
    ),
  ).toEqual(["cao-wei"]);
});
