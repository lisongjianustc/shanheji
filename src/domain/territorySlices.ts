import { yearOf, lastYear } from "./time";
import type { Territory, Relation } from "./types";
import { isSupportedYear, nextYear } from "./chronology";
export interface TerritorySlice {
  year: number;
  endYear?: number;
  entityId: string;
  interpretationId: string;
  regionIds: string[];
  relations: Relation[];
  featureCount: number;
  disputed: boolean;
}
export function territoryAvailabilityYears(slices: TerritorySlice[]): number[] {
  return [
    ...new Set(slices.flatMap((s) => [s.year, nextYear(s.endYear ?? s.year)])),
  ]
    .filter(isSupportedYear)
    .sort((a, b) => a - b);
}
export function buildTerritorySlices(features: Territory[]): TerritorySlice[] {
  const groups = new Map<string, TerritorySlice>();
  const seen = new Set<string>();
  for (const { properties: p } of features) {
    if (p.review.status !== "verified" || seen.has(p.id)) continue;
    seen.add(p.id);
    const year = p.snapshotYear ?? yearOf(p.validity.start.earliest);
    const endYear =
      p.temporalSupport === "interval" ? lastYear(p.validity) : undefined;
    const key = `${year}/${endYear ?? year}/${p.entityId}/${p.interpretationId}`;
    const row = groups.get(key) ?? {
      year,
      ...(endYear !== undefined ? { endYear } : {}),
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
