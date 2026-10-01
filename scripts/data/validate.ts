import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Catalog, DataPackage, Evidence } from "../../src/domain/types";
import { catalogSchema, packageSchema } from "../../src/domain/schema";
export interface Issue {
  code: string;
  recordId: string;
  message: string;
  severity: "error" | "warning";
}
export const stable = (x: unknown): string =>
  JSON.stringify(x, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
export function validateDataset(c: Catalog, packs: DataPackage[]): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, id: string, message: string) =>
    issues.push({ code, recordId: id, message, severity: "error" });
  const parsed = catalogSchema.safeParse(c);
  if (!parsed.success) {
    add("SCHEMA", "catalog", parsed.error.message);
    return issues;
  }
  const sourceMap = new Map(c.sources.map((x) => [x.id, x]));
  const entities = new Set(c.entities.map((x) => x.id)),
    places = new Set(c.places.map((x) => x.id));
  const seen = new Map<string, string>();
  const unique = (id: string, value: unknown) => {
    const json = stable(value);
    if (seen.has(id) && seen.get(id) !== json)
      add("ID_CONFLICT", id, "同编号内容冲突");
    else seen.set(id, json);
  };
  const evidence = (id: string, items: Evidence[]) =>
    items.forEach((e) => {
      if (!sourceMap.has(e.sourceId)) add("MISSING_SOURCE", id, e.sourceId);
      if (!e.locator.trim()) add("MISSING_LOCATOR", id, "缺少来源定位");
    });
  const placeRef = (id: string, refs: string[]) =>
    refs.forEach((p) => {
      if (!places.has(p)) add("MISSING_PLACE", id, p);
    });
  c.sources.forEach((s) => unique(s.id, s));
  c.entities.forEach((e) => {
    unique(e.id, e);
    e.names.forEach((n) => evidence(e.id, n.evidence));
    e.capitals.forEach((p) => {
      placeRef(e.id, [p.placeId]);
      evidence(e.id, p.evidence);
    });
  });
  c.places.forEach((p) => {
    unique(p.id, p);
    p.names.forEach((n) => evidence(p.id, n.evidence));
    p.locations.forEach((l) => evidence(p.id, l.evidence));
  });
  for (const p of packs) {
    const result = packageSchema.safeParse(p);
    if (!result.success) {
      add("SCHEMA", p.id, result.error.message);
      continue;
    }
    for (const t of p.territories) {
      const r = t.properties;
      unique(r.id, t);
      evidence(r.id, [...r.evidence, ...r.review.evidence]);
      if (!entities.has(r.entityId)) add("MISSING_ENTITY", r.id, r.entityId);
      if (r.review.status === "verified")
        r.evidence.forEach((e) => {
          if (sourceMap.get(e.sourceId)?.redistribution !== "allowed")
            add("GEOMETRY_PERMISSION", r.id, e.sourceId);
        });
    }
    for (const e of p.events) {
      unique(e.id, e);
      evidence(e.id, [...e.evidence, ...e.review.evidence]);
      placeRef(e.id, e.placeIds);
      e.entityIds.forEach((id) => {
        if (!entities.has(id)) add("MISSING_ENTITY", e.id, id);
      });
    }
    p.coverage.forEach((v) => {
      unique(v.id, v);
      evidence(v.id, v.evidence);
    });
  }
  return issues;
}
export async function readDataset(
  root: string,
): Promise<{ catalog: Catalog; packs: DataPackage[] }> {
  const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
  const catalog = catalogSchema.parse({
    sources: await json(join(root, "catalog/sources.json")),
    entities: await json(join(root, "catalog/entities.json")),
    places: await json(join(root, "catalog/places.json")),
  });
  const dirs = await readdir(join(root, "packages"), { withFileTypes: true });
  const packs: DataPackage[] = [];
  for (const d of dirs.filter((d) => d.isDirectory()))
    packs.push(
      packageSchema.parse(
        await json(join(root, "packages", d.name, "package.json")),
      ),
    );
  return { catalog, packs };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { catalog, packs } = await readDataset("data");
    const arg = process.argv.indexOf("--package");
    if (arg >= 0 && !process.argv[arg + 1])
      throw new Error("--package需要包名");
    const report = datasetReport(
      catalog,
      packs,
      arg >= 0 ? process.argv[arg + 1] : undefined,
    );
    const issues = report.issues;
    console.log(JSON.stringify(report, null, 2));
    if (issues.some((i) => i.severity === "error")) process.exitCode = 1;
  } catch (e) {
    console.error(String(e));
    process.exitCode = 1;
  }
}
export function datasetReport(
  catalog: Catalog,
  packs: DataPackage[],
  packageId?: string,
) {
  const selected = packageId ? packs.filter((p) => p.id === packageId) : packs;
  if (packageId && !selected.length)
    throw new Error(`未知数据包：${packageId}`);
  return {
    packages: selected.length,
    events: selected.reduce((n, p) => n + p.events.length, 0),
    territories: selected.reduce((n, p) => n + p.territories.length, 0),
    issues: validateDataset(catalog, packs),
  };
}
