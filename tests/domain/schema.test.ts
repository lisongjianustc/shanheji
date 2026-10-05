import { validitySchema, packageSchema } from "../../src/domain/schema";
const time = {
  start: { earliest: "0300-01-01", latest: "0300-01-01" },
  endExclusive: { earliest: "0301-01-01", latest: "0301-01-01" },
  precision: "year",
  label: "300年",
};
it("rejects inverted temporal uncertainty", () =>
  expect(
    validitySchema.safeParse({
      ...time,
      start: { earliest: "0400-01-01", latest: "0300-01-01" },
    }).success,
  ).toBe(false));
it("rejects unknown record fields", () =>
  expect(validitySchema.safeParse({ ...time, invented: "x" }).success).toBe(
    false,
  ));
it("permits a valid uncertain year", () =>
  expect(validitySchema.safeParse(time).success).toBe(true));
it("rejects malformed package arrays", () =>
  expect(
    packageSchema.safeParse({
      id: "a",
      version: "1",
      events: "not-array",
      territories: [],
      coverage: [],
    }).success,
  ).toBe(false));

it("requires an independent source outline for a partial extent", async () => {
  const { makePackage } = await import("../fixtures/make");
  const { territorySchema } = await import("../../src/domain/schema");
  const t = makePackage().territories[0];
  t.properties.compilation.extent = "partial-source";
  expect(territorySchema.safeParse(t).success).toBe(false);
  t.properties.compilation.boundaryGeometry = {
    type: "MultiLineString",
    coordinates: [
      [
        [105, 30],
        [106, 31],
      ],
    ],
  };
  expect(territorySchema.safeParse(t).success).toBe(true);
  delete t.properties.compilation.extent;
  expect(territorySchema.safeParse(t).success).toBe(false);
});
