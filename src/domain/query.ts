import type {
  Catalog,
  DataPackage,
  Query,
  Scene,
  HistoricalEvent,
  Territory,
} from "./types";
import { classifyAt, overlapsYear, parseDay, yearDay, yearOf } from "./time";
export const eventMatchesYear = (e: HistoricalEvent, y: number) =>
  overlapsYear(e.validity, y);
export const DEFAULT_FILTERS = {
  regionIds: [],
  entityIds: [],
  eventKinds: [],
  relations: ["control"],
  interpretationIds: [],
  nearbyReference: false,
} satisfies Query["filters"];
export const defaultQuery = (year = 589): Query => ({
  year,
  at: null,
  filters: structuredClone(DEFAULT_FILTERS),
});
function unique<T>(a: T[], id: (x: T) => string): T[] {
  const m = new Map<string, T>();
  for (const r of a) {
    const key = id(r);
    if (m.has(key) && JSON.stringify(m.get(key)) !== JSON.stringify(r))
      throw new Error(`跨包记录冲突：${key}`);
    m.set(key, r);
  }
  return [...m.values()];
}
export function queryScene(c: Catalog, packs: DataPackage[], q: Query): Scene {
  if (!Number.isInteger(q.year) || q.year < 220 || q.year > 907)
    throw new Error("年份必须在220—907之间");
  if (q.at && yearOf(parseDay(q.at)) !== q.year)
    throw new Error("具体日期与年份不一致");
  const at = q.at ?? yearDay(q.year, "12-31"),
    f = q.filters;
  const all = unique(
    packs.flatMap((p) => p.territories),
    (t) => t.properties.id,
  ).filter((t) => t.properties.review.status === "verified");
  const allowed = all.filter(
    ({ properties: p }) =>
      (!f.regionIds.length ||
        p.regionIds.some((x) => f.regionIds.includes(x))) &&
      (!f.entityIds.length || f.entityIds.includes(p.entityId)) &&
      f.relations.includes(p.relation) &&
      (!f.interpretationIds.length ||
        f.interpretationIds.includes(p.interpretationId)),
  );
  let territories = allowed.filter(({ properties: p }) =>
    p.temporalSupport === "snapshot"
      ? p.snapshotYear === q.year &&
        (!q.at || classifyAt(p.validity, at) !== "outside")
      : classifyAt(p.validity, at) !== "outside",
  );
  const referenceYears: number[] = [];
  if (f.nearbyReference) {
    const groups = new Map<string, Territory[]>();
    for (const t of allowed.filter(
      (t) => t.properties.temporalSupport === "snapshot",
    )) {
      const p = t.properties,
        key = `${p.entityId}/${p.relation}/${p.interpretationId}`;
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    for (const [key, list] of groups) {
      if (
        territories.some(
          (t) =>
            `${t.properties.entityId}/${t.properties.relation}/${t.properties.interpretationId}` ===
            key,
        )
      )
        continue;
      const chosen = list.sort(
        (a, b) =>
          Math.abs(a.properties.snapshotYear! - q.year) -
            Math.abs(b.properties.snapshotYear! - q.year) ||
          a.properties.snapshotYear! - b.properties.snapshotYear!,
      )[0];
      territories.push(chosen);
      referenceYears.push(chosen.properties.snapshotYear!);
    }
  }
  const events = unique(
    packs.flatMap((p) => p.events),
    (e) => e.id,
  )
    .filter(
      (e) =>
        e.review.status === "verified" &&
        eventMatchesYear(e, q.year) &&
        (!f.eventKinds.length || f.eventKinds.includes(e.kind)) &&
        (!f.entityIds.length ||
          e.entityIds.some((id) => f.entityIds.includes(id))) &&
        (!f.regionIds.length ||
          e.entityIds.some((id) =>
            c.entities
              .find((x) => x.id === id)
              ?.regionIds.some((r) => f.regionIds.includes(r)),
          )),
    )
    .sort(
      (a, b) =>
        a.validity.start.earliest.localeCompare(b.validity.start.earliest) ||
        a.title.localeCompare(b.title),
    );
  const coverage = unique(
    packs.flatMap((p) => p.coverage),
    (v) => v.id,
  ).filter(
    (v) =>
      v.startYear <= q.year &&
      v.endYear >= q.year &&
      (!f.regionIds.length || f.regionIds.includes(v.regionId)),
  );
  const warnings: string[] = [];
  if (!territories.length)
    warnings.push(
      all.length && allowed.length === 0
        ? "当前筛选条件下没有疆域记录"
        : "当前年份缺少可用疆域资料",
    );
  if (!coverage.length) warnings.push("当前区域资料覆盖情况未知");
  if (coverage.some((x) => x.status !== "verified"))
    warnings.push("部分地区或主题资料尚未完成核验");
  if (referenceYears.length)
    warnings.push(
      `邻近年份参考：${[...new Set(referenceYears)].sort((a, b) => a - b).join("、")}年，不代表所选年份疆域`,
    );
  const territoryTimeLabels = Object.fromEntries(
    territories.map((t) => [t.properties.id, t.properties.validity.label]),
  );
  return {
    query: q,
    referenceAt: at,
    catalog: c,
    territories,
    events,
    coverage,
    uncertainTerritoryIds: territories
      .filter((t) => classifyAt(t.properties.validity, at) === "possible")
      .map((t) => t.properties.id),
    referenceYears: [...new Set(referenceYears)].sort((a, b) => a - b),
    territoryTimeLabels,
    warnings,
  };
}
