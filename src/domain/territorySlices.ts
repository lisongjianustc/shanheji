import type { Territory, Relation } from "./types";
export interface TerritorySlice {
  year: number;
  entityId: string;
  interpretationId: string;
  regionIds: string[];
  relations: Relation[];
  featureCount: number;
  disputed: boolean;
}
export function buildTerritorySlices(features: Territory[]): TerritorySlice[] {
  const groups = new Map<string, TerritorySlice>();
  const seen = new Set<string>();
  for (const { properties: p } of features) {
    if (
      p.review.status !== "verified" ||
      p.temporalSupport !== "snapshot" ||
      p.snapshotYear === null ||
      seen.has(p.id)
    )
      continue;
    seen.add(p.id);
    const key = `${p.snapshotYear}/${p.entityId}/${p.interpretationId}`;
    const row = groups.get(key) ?? {
      year: p.snapshotYear,
      entityId: p.entityId,
      interpretationId: p.interpretationId,
      regionIds: [],
      relations: [],
      featureCount: 0,
      disputed: false,
    };
    row.regionIds = [...new Set([...row.regionIds, ...p.regionIds])].sort();
    row.relations = [...new Set([...row.relations, p.relation])].sort();
    row.featureCount++;
    row.disputed ||= p.spatialPrecision === "disputed";
    groups.set(key, row);
  }
  return [...groups.values()].sort(
    (a, b) =>
      a.year - b.year ||
      a.entityId.localeCompare(b.entityId) ||
      a.interpretationId.localeCompare(b.interpretationId),
  );
}
