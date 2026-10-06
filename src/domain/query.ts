import { isSupportedYear, formatYear } from "./chronology";
import type {
  Catalog,
  DataPackage,
  Query,
  Scene,
  HistoricalEvent,
  Territory,
} from "./types";
import {
  classifyAt,
  compareDays,
  overlapsYear,
  parseDay,
  yearDay,
  yearOf,
} from "./time";
export const eventMatchesYear = (e: HistoricalEvent, y: number) =>
  overlapsYear(e.validity, y);
export const DEFAULT_FILTERS = {
  regionIds: [],
  entityIds: [],
  eventKinds: [],
  relations: ["control", "administration", "reconstruction"],
  interpretationIds: [],
  nearbyReference: false,
} satisfies Query["filters"];
export const defaultQuery = (year = 661): Query => ({
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
export function queryScene(
  c: Catalog,
  packs: DataPackage[],
  q: Query,
  defaultInterpretationIds: string[] = [],
): Scene {
  if (!isSupportedYear(q.year))
    throw new Error("年份须为公元前2100年至1912年，不含0年");
  if (q.at && yearOf(parseDay(q.at)) !== q.year)
    throw new Error("具体日期与年份不一致");
  const at = q.at ?? yearDay(q.year, "12-31"),
    f = q.filters;
  const all = unique(
    packs.flatMap((p) => p.territories),
    (t) => t.properties.id,
  ).filter((t) => t.properties.review.status === "verified");
  const versions = f.interpretationIds.length
    ? f.interpretationIds
    : defaultInterpretationIds;
  if (
    !versions.length &&
    new Set(all.map((t) => t.properties.interpretationId)).size > 1
  )
    throw new Error("存在多个编制版本，请先指定默认版本或选择版本");
  const allowed = all.filter(
    ({ properties: p }) =>
      (!f.regionIds.length ||
        p.regionIds.some((x) => f.regionIds.includes(x))) &&
      (!f.entityIds.length || f.entityIds.includes(p.entityId)) &&
      f.relations.includes(p.relation) &&
      (!versions.length || versions.includes(p.interpretationId)),
  );
  const matchesTime = ({ properties: p }: Territory) =>
    p.temporalSupport === "snapshot"
      ? p.snapshotYear === q.year &&
        (!q.at ||
          (p.validity.precision !== "year" &&
            classifyAt(p.validity, at) !== "outside"))
      : (!q.at || p.validity.precision !== "year") &&
        classifyAt(p.validity, at) !== "outside";
  let territories = allowed.filter(matchesTime);
  const referenceYears: number[] = [];
  if (f.nearbyReference && !q.at) {
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
      territories.push(
        ...list.filter(
          (t) => t.properties.snapshotYear === chosen.properties.snapshotYear,
        ),
      );
      referenceYears.push(chosen.properties.snapshotYear!);
    }
  }
  const snapshotChoices: { id: string; label: string }[] = [];
  let multiplePhases = false;
  if (!q.at) {
    const groups = new Map<string, Territory[]>();
    for (const t of territories.filter(
      (t) => t.properties.temporalSupport === "snapshot",
    )) {
      const p = t.properties,
        key = `${p.entityId}/${p.relation}/${p.interpretationId}`;
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    for (const list of groups.values()) {
      const signature = (t: Territory) =>
        JSON.stringify([
          t.properties.validity.start,
          t.properties.validity.endExclusive,
        ]);
      const phases = [...new Map(list.map((t) => [signature(t), t])).values()];
      if (phases.length < 2) continue;
      multiplePhases = true;
      snapshotChoices.push(
        ...phases.map((t) => ({
          id: t.properties.id,
          label: `${c.entities.find((e) => e.id === t.properties.entityId)?.names[0]?.text ?? t.properties.entityId} · ${t.properties.validity.label}`,
        })),
      );
      const chosen =
        list.find((t) => t.properties.id === q.snapshotId) ??
        phases.sort((a, b) =>
          compareDays(
            b.properties.validity.start.earliest,
            a.properties.validity.start.earliest,
          ),
        )[0];
      const excluded = new Set(
        list
          .filter((t) => signature(t) !== signature(chosen))
          .map((t) => t.properties.id),
      );
      territories = territories.filter((t) => !excluded.has(t.properties.id));
    }
  }
  // A dated source takes precedence over a coarse reconstruction of the same
  // entity by default. Explicit source selection keeps the requested version.
  if (!f.interpretationIds.length) {
    const datedEntities = new Set(
      territories
        .filter(
          (t) =>
            t.properties.temporalSupport === "snapshot" &&
            t.properties.relation !== "reconstruction",
        )
        .map((t) => t.properties.entityId),
    );
    territories = territories.filter(
      (t) =>
        t.properties.relation !== "reconstruction" ||
        !datedEntities.has(t.properties.entityId),
    );
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
        compareDays(a.validity.start.earliest, b.validity.start.earliest) ||
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
  if (territories.some((t) => t.properties.spatialPrecision === "disputed"))
    warnings.push("存在边界争议；行政、复原与主张不等于实控");
  if (territories.some((t) => t.properties.relation === "reconstruction"))
    warnings.push("研究来源按年份区间复原；转折可能缺漏，非确日格局");
  if (multiplePhases)
    warnings.push("本年存在多个疆域阶段；每个政权默认显示较晚切片，可切换阶段");
  if (
    !q.at &&
    new Set(
      territories.map((t) =>
        JSON.stringify([
          t.properties.validity.start,
          t.properties.validity.endExclusive,
        ]),
      ),
    ).size > 1
  )
    warnings.push("本年资料，参考时点不一；不代表同一瞬间");
  if (q.at && f.nearbyReference)
    warnings.push("具体日期模式仅显示该日有效资料，不使用近年参考切片");
  if (!territories.length)
    warnings.push(
      all.some(
        (t) =>
          matchesTime(t) ||
          (f.nearbyReference &&
            !q.at &&
            t.properties.temporalSupport === "snapshot"),
      )
        ? "当前筛选条件下没有疆域记录"
        : "当前年份缺少可用疆域资料",
    );
  if (!coverage.length) warnings.push("当前区域资料覆盖情况未知");
  if (coverage.some((x) => x.status !== "verified"))
    warnings.push("完整疆界及事件资料仍待补齐");
  if (referenceYears.length)
    warnings.push(
      `邻近年份参考：${[...new Set(referenceYears)]
        .sort((a, b) => a - b)
        .map(formatYear)
        .join("、")}，不代表所选年份疆域`,
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
    snapshotChoices,
    warnings,
  };
}
