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
    [742, ["tang"]],
  ] as const) {
    const scene = queryScene(catalog, packs, defaultQuery(year), defaults);
    expect(
      scene.territories
        .filter((t) => !t.properties.id.startsWith("clio-"))
        .map((t) => t.properties.entityId)
        .sort(),
    ).toEqual([...entities].sort());
    expect(
      scene.territories
        .filter((t) => !t.properties.id.startsWith("clio-"))
        .every((t) => t.properties.relation === "administration"),
    ).toBe(true);
    expect(
      queryScene(
        catalog,
        packs,
        defaultQuery(year + 1),
        defaults,
      ).territories.filter((t) => !t.properties.id.startsWith("clio-")),
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
    queryScene(catalog, packs, defaultQuery(609), defaults).territories.filter(
      (t) => !t.properties.id.startsWith("clio-"),
    ),
  ).toHaveLength(0);
  expect(
    queryScene(catalog, packs, defaultQuery(610), defaults).territories.find(
      (t) => t.properties.id === "sui-610-partial-administration",
    )!.properties.compilation.extent,
  ).toBe("partial-source");
  const q = defaultQuery(262);
  q.filters.regionIds = ["korea"];
  expect(
    queryScene(catalog, packs, q, defaults)
      .territories.filter((t) => !t.properties.id.startsWith("clio-"))
      .map((t) => t.properties.entityId),
  ).toEqual(["cao-wei"]);
});

it("keeps the 742 eastern slice dated and excludes exact days and adjacent years", async () => {
  const { catalog, packs } = await readDataset("data");
  for (const q of [
    defaultQuery(741),
    defaultQuery(743),
    { ...defaultQuery(742), at: "0742-06-01" },
  ]) {
    expect(
      queryScene(catalog, packs, q, defaults).territories.filter(
        (t) => !t.properties.id.startsWith("clio-"),
      ),
    ).toHaveLength(0);
  }
  const t = queryScene(
    catalog,
    packs,
    defaultQuery(742),
    defaults,
  ).territories.find(
    (t) => t.properties.id === "tang-742-eastern-administration",
  )!;
  expect(t.properties.id).toBe("tang-742-eastern-administration");
  expect(t.properties.compilation.extent).toBe("partial-source");
  expect(t.properties.compilation.errorNote).toContain("105°E");
});
