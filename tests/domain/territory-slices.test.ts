import { buildTerritorySlices } from "../../src/domain/territorySlices";
import { makePackage } from "../fixtures/make";
it("indexes verified snapshots without inferring years between them", () => {
  const p = makePackage();
  const a = p.territories[0];
  Object.assign(a.properties, {
    temporalSupport: "snapshot",
    snapshotYear: 300,
    spatialPrecision: "disputed",
    relation: "administration",
  });
  const b = structuredClone(a);
  b.properties.id = "later";
  b.properties.snapshotYear = 400;
  p.territories.push(b);
  const pending = structuredClone(a);
  pending.properties.id = "pending";
  pending.properties.snapshotYear = 500;
  pending.properties.review.status = "pending";
  p.territories.push(pending);
  const rows = buildTerritorySlices(p.territories);
  expect(rows.map((x) => x.year)).toEqual([300, 400]);
  expect(rows[0].disputed).toBe(true);
  expect(rows[0].relations).toEqual(["administration"]);
});
