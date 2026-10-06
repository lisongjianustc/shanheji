import { MIN_YEAR, MAX_YEAR, nextYear } from "./chronology";
import { yearOf, lastYear } from "./time";
import type { Catalog, Filters, Validity } from "./types";
import type { TerritorySlice } from "./territorySlices";

export type Availability = "available" | "partial" | "missing";
export interface AvailabilitySpan {
  startYear: number;
  endYear: number;
  status: Availability;
}
export interface AnnualCoverageRow {
  id: string;
  entityId: string;
  name: string;
  startYear: number;
  endYear: number;
  availableYears: number;
  partialYears: number;
  missingYears: number;
  spans: AvailabilitySpan[];
}
const bounds = (v: Validity) =>
  [yearOf(v.start.earliest), lastYear(v)] as const;
const contains = (range: readonly number[], year: number) =>
  range[0] <= year && year <= range[1];

/** Presence of accepted source ranges, never a certificate of complete borders.
 * Ignores nearby references and exact-day selection: this is an annual index.
 * Uses the same default dated-reference precedence as queryScene.
 */
export function buildAnnualCoverage(
  catalog: Catalog,
  slices: TerritorySlice[],
  filters: Filters,
  defaults: string[],
): AnnualCoverageRow[] {
  const versions = filters.interpretationIds.length
    ? filters.interpretationIds
    : defaults;
  const rows: AnnualCoverageRow[] = [];
  for (const entity of catalog.entities) {
    if (filters.entityIds.length && !filters.entityIds.includes(entity.id))
      continue;
    if (
      filters.regionIds.length &&
      !entity.regionIds.some((r) => filters.regionIds.includes(r))
    )
      continue;
    const active = (entity.activePeriods ?? [entity.existence]).map(bounds);
    const names = entity.names.map((n) => ({
      text: n.text,
      range: bounds(n.validity),
    }));
    const candidates = slices
      .flatMap(
        (s) =>
          s.parts?.map((part) => ({
            ...s,
            relations: [part.relation],
            partial: part.partial,
            regionIds: part.regionIds,
          })) ?? [s],
      )
      .filter(
        (s) =>
          s.entityId === entity.id &&
          (!versions.length || versions.includes(s.interpretationId)) &&
          (!filters.regionIds.length ||
            s.regionIds.some((r) => filters.regionIds.includes(r))) &&
          s.relations.some((r) => filters.relations.includes(r)),
      );
    const start = Math.max(MIN_YEAR, Math.min(...active.map((r) => r[0])));
    const end = Math.min(MAX_YEAR, Math.max(...active.map((r) => r[1])));
    let row: AnnualCoverageRow | undefined;
    for (let year = start; year <= end; year = nextYear(year)) {
      if (!active.some((r) => contains(r, year))) {
        row = undefined;
        continue;
      }
      const name =
        names.find((n) => contains(n.range, year))?.text ??
        names[0]?.text ??
        entity.id;
      if (!row || row.name !== name) {
        row = {
          id: `${entity.id}/${year}`,
          entityId: entity.id,
          name,
          startYear: year,
          endYear: year,
          availableYears: 0,
          partialYears: 0,
          missingYears: 0,
          spans: [],
        };
        rows.push(row);
      }
      let sources = candidates.filter(
        (s) => year >= s.year && year <= (s.endYear ?? s.year),
      );
      const dated =
        !filters.interpretationIds.length &&
        sources.some(
          (s) =>
            s.endYear === undefined &&
            s.relations.some(
              (r) => r !== "reconstruction" && filters.relations.includes(r),
            ),
        );
      if (dated)
        sources = sources.filter((s) =>
          s.relations.some(
            (r) => r !== "reconstruction" && filters.relations.includes(r),
          ),
        );
      const status: Availability = !sources.length
        ? "missing"
        : sources.every((s) => s.partial)
          ? "partial"
          : "available";
      row.endYear = year;
      row[
        status === "missing"
          ? "missingYears"
          : status === "partial"
            ? "partialYears"
            : "availableYears"
      ]++;
      const last = row.spans.at(-1);
      if (last?.status === status && nextYear(last.endYear) === year)
        last.endYear = year;
      else row.spans.push({ startYear: year, endYear: year, status });
    }
  }
  return rows.sort(
    (a, b) => a.startYear - b.startYear || a.name.localeCompare(b.name, "zh"),
  );
}
