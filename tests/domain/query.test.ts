import { queryScene } from "../../src/domain/query";
import { makeCatalog, makePackage, makeQuery, time } from "../fixtures/make";
it("shows events without assigning an invented point", () => {
  const p = makePackage();
  p.events[0].placeIds = [];
  expect(queryScene(makeCatalog(), [p], makeQuery()).events).toHaveLength(1);
});
it("never carries a snapshot into the next year", () => {
  const p = makePackage();
  Object.assign(p.territories[0].properties, {
    temporalSupport: "snapshot",
    snapshotYear: 300,
  });
  const s = queryScene(makeCatalog(), [p], makeQuery(301));
  expect(s.territories).toHaveLength(0);
  expect(s.warnings.length).toBeGreaterThan(0);
});
it("uses an interval only within supported dates", () => {
  const p = makePackage();
  expect(
    queryScene(makeCatalog(), [p], makeQuery(301)).territories,
  ).toHaveLength(1);
  expect(
    queryScene(makeCatalog(), [p], makeQuery(303)).territories,
  ).toHaveLength(0);
});
it("does not combine vassal geometry into default control", () => {
  const p = makePackage();
  p.territories[0].properties.relation = "vassal";
  expect(queryScene(makeCatalog(), [p], makeQuery()).territories).toHaveLength(
    0,
  );
});
it("distinguishes possible dates from certain dates", () => {
  const p = makePackage();
  p.territories[0].properties.validity.start.latest = "0301-12-31";
  expect(
    queryScene(makeCatalog(), [p], makeQuery()).uncertainTerritoryIds,
  ).toEqual(["test-territory"]);
});
it("shows a mid-year snapshot as a slice, never as year-end evidence", () => {
  const p = makePackage();
  const v = p.territories[0].properties;
  v.temporalSupport = "snapshot";
  v.snapshotYear = 300;
  v.validity = {
    ...time(),
    endExclusive: { earliest: "0300-07-01", latest: "0300-07-01" },
    label: "300年上半年切片",
  };
  expect(
    queryScene(makeCatalog(), [p], makeQuery()).territoryTimeLabels[
      "test-territory"
    ],
  ).toBe("300年上半年切片");
  expect(
    queryScene(makeCatalog(), [p], { ...makeQuery(), at: "0300-12-31" })
      .territories,
  ).toHaveLength(0);
});
it("only allows nearest slices on explicit request", () => {
  const p = makePackage();
  Object.assign(p.territories[0].properties, {
    temporalSupport: "snapshot",
    snapshotYear: 300,
  });
  const q = makeQuery(301);
  q.filters.nearbyReference = true;
  expect(queryScene(makeCatalog(), [p], q).referenceYears).toEqual([300]);
});
it("deduplicates repeated event identity across packages", () =>
  expect(
    queryScene(makeCatalog(), [makePackage("a"), makePackage("b")], makeQuery())
      .events,
  ).toHaveLength(1));
it("rejects out-of-scope years and mismatched day", () => {
  expect(() => queryScene(makeCatalog(), [], makeQuery(908))).toThrow();
  expect(() =>
    queryScene(makeCatalog(), [], { ...makeQuery(), at: "0301-01-01" }),
  ).toThrow();
});
it("uses editorial defaults instead of overlaying interpretations", () => {
  const p = makePackage();
  const b = structuredClone(p.territories[0]);
  b.properties.id = "alternative";
  b.properties.interpretationId = "alternative";
  p.territories.push(b);
  const q = makeQuery();
  q.filters.interpretationIds = [];
  expect(
    queryScene(makeCatalog(), [p], q, ["test-interpretation"]).territories.map(
      (t) => t.properties.id,
    ),
  ).toEqual(["test-territory"]);
});
it("never resurrects an invalid snapshot for an exact date with nearby enabled", () => {
  const p = makePackage();
  Object.assign(p.territories[0].properties, {
    temporalSupport: "snapshot",
    snapshotYear: 300,
    validity: {
      ...time(),
      endExclusive: { earliest: "0300-07-01", latest: "0300-07-01" },
    },
  });
  const q = makeQuery();
  q.at = "0300-10-01";
  q.filters.nearbyReference = true;
  expect(queryScene(makeCatalog(), [p], q).territories).toHaveLength(0);
});
it("selects one annual phase and allows the earlier phase to be chosen", () => {
  const p = makePackage();
  const a = p.territories[0];
  Object.assign(a.properties, {
    temporalSupport: "snapshot",
    snapshotYear: 300,
    validity: {
      ...time(),
      endExclusive: { earliest: "0300-07-01", latest: "0300-07-01" },
      label: "上半年",
    },
  });
  const b = structuredClone(a);
  b.properties.id = "later";
  b.properties.validity = {
    ...time(),
    start: { earliest: "0300-07-01", latest: "0300-07-01" },
    label: "下半年",
  };
  p.territories.push(b);
  const s = queryScene(makeCatalog(), [p], makeQuery());
  expect(s.territories.map((t) => t.properties.id)).toEqual(["later"]);
  expect(s.snapshotChoices).toHaveLength(2);
  expect(
    queryScene(makeCatalog(), [p], {
      ...makeQuery(),
      snapshotId: "test-territory",
    }).territories.map((t) => t.properties.id),
  ).toEqual(["test-territory"]);
});
it("warns when different polities use different reference periods", () => {
  const p = makePackage();
  const b = structuredClone(p.territories[0]);
  b.properties.id = "other";
  b.properties.entityId = "other";
  b.properties.validity = time(300, 301);
  p.territories.push(b);
  expect(
    queryScene(makeCatalog(), [p], makeQuery()).warnings.join(" "),
  ).toContain("本年资料，参考时点不一");
});
it("requires a version choice if competing versions have no editorial default", () => {
  const p = makePackage();
  const b = structuredClone(p.territories[0]);
  b.properties.id = "other";
  b.properties.interpretationId = "other";
  p.territories.push(b);
  const q = makeQuery();
  q.filters.interpretationIds = [];
  expect(() => queryScene(makeCatalog(), [p], q)).toThrow(/默认版本/);
});
