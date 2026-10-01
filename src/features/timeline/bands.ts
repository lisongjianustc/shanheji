import type { Entity, Filters } from "../../domain/types";
import { yearOf } from "../../domain/time";
export function buildBands(entities: Entity[], filters: Filters) {
  return entities
    .filter(
      (e) =>
        (!filters.regionIds.length ||
          e.regionIds.some((r) => filters.regionIds.includes(r))) &&
        (!filters.entityIds.length || filters.entityIds.includes(e.id)),
    )
    .flatMap((e) =>
      (e.activePeriods ?? [e.existence]).map((v) => ({
        entityId: e.id,
        label: [...new Set(e.names.map((n) => n.text))].join(" / "),
        startYear: Math.max(220, yearOf(v.start.earliest)),
        endYear: Math.min(
          907,
          yearOf(v.endExclusive.latest) -
            Number(v.endExclusive.latest.endsWith("-01-01")),
        ),
        uncertain:
          v.start.earliest !== v.start.latest ||
          v.endExclusive.earliest !== v.endExclusive.latest,
      })),
    )
    .filter((e) => e.startYear <= e.endYear);
}
