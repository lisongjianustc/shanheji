import { buildAnnualCoverage } from "../../src/domain/annualCoverage";
import { buildTerritorySlices } from "../../src/domain/territorySlices";
import { defaultQuery } from "../../src/domain/query";
import { makeScene, makePackage } from "../fixtures/make";
import { yearDay } from "../../src/domain/time";
import type { Validity } from "../../src/domain/types";
const validity = (start: number, end: number): Validity => ({
  start: { earliest: yearDay(start), latest: yearDay(start) },
  endExclusive: { earliest: yearDay(end), latest: yearDay(end) },
  precision: "year",
  label: "fixture",
});
import type { TerritorySlice } from "../../src/domain/territorySlices";
function setup() {
  const scene = makeScene();
  const e = scene.catalog.entities[0];
  e.existence = validity(300, 306);
  e.names = [{ text: "东晋", validity: e.existence, evidence: [] }];
  const slice: TerritorySlice = {
    year: 302,
    entityId: e.id,
    interpretationId: "test",
    regionIds: e.regionIds,
    relations: ["reconstruction"],
    featureCount: 1,
    disputed: true,
    partial: true,
  };
  return { scene, e, slice };
}
it("keeps each unsupported year missing and labels partial source frames", () => {
  const { scene, slice } = setup();
  const [row] = buildAnnualCoverage(
    scene.catalog,
    [slice],
    defaultQuery().filters,
    ["test"],
  );
  expect([row.availableYears, row.partialYears, row.missingYears]).toEqual([
    0, 1, 5,
  ]);
  expect(row.spans).toEqual([
    { startYear: 300, endYear: 301, status: "missing" },
    { startYear: 302, endYear: 302, status: "partial" },
    { startYear: 303, endYear: 305, status: "missing" },
  ]);
});
it("splits names and respects inactive periods and no year zero", () => {
  const { scene, e } = setup();
  e.existence = validity(-2, 3);
  e.activePeriods = [validity(-2, 1), validity(2, 3)];
  e.names = [
    { text: "前期", validity: validity(-2, 1), evidence: [] },
    { text: "后期", validity: validity(1, 3), evidence: [] },
  ];
  const rows = buildAnnualCoverage(
    scene.catalog,
    [],
    defaultQuery().filters,
    [],
  );
  expect(
    rows.map((r) => [r.name, r.startYear, r.endYear, r.missingYears]),
  ).toEqual([
    ["前期", -2, -1, 2],
    ["后期", 2, 2, 1],
  ]);
});
it("uses dated-reference precedence while keeping explicitly requested versions", () => {
  const { scene, slice } = setup();
  const whole = {
    ...slice,
    year: 300,
    endYear: 305,
    interpretationId: "research",
    partial: false,
  };
  const dated = {
    ...slice,
    relations: ["administration"] as TerritorySlice["relations"],
  };
  const filters = defaultQuery().filters;
  expect(
    buildAnnualCoverage(scene.catalog, [whole, dated], filters, [
      "test",
      "research",
    ])[0].partialYears,
  ).toBe(1);
  filters.interpretationIds = ["research"];
  expect(
    buildAnnualCoverage(scene.catalog, [whole, dated], filters, [
      "test",
      "research",
    ])[0].availableYears,
  ).toBe(6);
});
it("empty relations display no available source; region/source filters apply", () => {
  const { scene, slice } = setup();
  const filters = defaultQuery().filters;
  filters.relations = [];
  expect(
    buildAnnualCoverage(scene.catalog, [slice], filters, ["test"])[0]
      .missingYears,
  ).toBe(6);
  filters.regionIds = ["unregistered-region"];
  expect(
    buildAnnualCoverage(scene.catalog, [slice], filters, ["test"]),
  ).toEqual([]);
});
it("separates mixed relations and extents so filtering retains partial truth", () => {
  const p = makePackage();
  const a = p.territories[0];
  a.properties.compilation.extent = "partial-source";
  const b = structuredClone(a);
  b.properties.id = "whole-other-relation";
  b.properties.relation = "claim";
  delete b.properties.compilation.extent;
  const slices = buildTerritorySlices([a, b]);
  expect(slices).toHaveLength(1);
  expect(slices[0].parts?.map((s) => s.partial).sort()).toEqual([false, true]);
  const scene = makeScene();
  const e = scene.catalog.entities[0];
  e.existence = a.properties.validity;
  e.names = [{ text: "测试国", validity: e.existence, evidence: [] }];
  const filters = defaultQuery().filters;
  filters.relations = [a.properties.relation];
  expect(
    buildAnnualCoverage(scene.catalog, slices, filters, [
      a.properties.interpretationId,
    ])[0].partialYears,
  ).toBe(3);
});
