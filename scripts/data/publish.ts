import { MIN_YEAR, MAX_YEAR } from "../../src/domain/chronology";
import { compareDays } from "../../src/domain/time";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readDataset, validateDataset, stable } from "./validate";
import type { Manifest, Resource } from "../../src/data/manifest";
import { mapPlateSchema } from "../../src/data/manifest";
import { buildSearchIndex } from "../../src/features/search/index";
import { buildTerritorySlices } from "../../src/domain/territorySlices";
export async function publishDataset(
  inputRoot: string,
  outputRoot: string,
): Promise<Manifest> {
  const { catalog, packs } = await readDataset(inputRoot);
  const issues = validateDataset(catalog, packs);
  if (issues.length) throw new Error(JSON.stringify(issues));
  const sourceText = stable({ catalog, packs });
  if (/"(?:id|entityId|placeId)":"test-/.test(sourceText))
    throw new Error("测试数据禁止进入正式发布");
  const clean = packs.map((p) => ({
    ...p,
    territories: p.territories.filter(
      (t) => t.properties.review.status === "verified",
    ),
    events: p.events.filter((e) => e.review.status === "verified"),
  }));
  const features = clean.flatMap((p) => p.territories);
  if (features.length) {
    const result = spawnSync(
      resolve(".venv/bin/python"),
      [resolve("scripts/data/geometry_check.py")],
      {
        input: JSON.stringify({ type: "FeatureCollection", features }),
        encoding: "utf8",
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        `几何检查失败: ${result.error ?? result.stdout ?? result.stderr}`,
      );
  }
  await mkdir(outputRoot, { recursive: true });
  const store = async (prefix: string, value: unknown): Promise<Resource> => {
    const body = stable(value);
    const sha256 = createHash("sha256").update(body).digest("hex");
    const path = `${prefix}-${sha256.slice(0, 16)}.json`;
    await writeFile(join(outputRoot, path), body);
    return { path, sha256 };
  };
  const catalogResource = await store("catalog", catalog);
  const packages: Manifest["packages"] = [];
  for (const p of clean) {
    const years = p.coverage.flatMap((c) => [c.startYear, c.endYear]);
    packages.push({
      ...(await store("package", p)),
      id: p.id,
      version: p.version,
      startYear: years.length ? Math.min(...years) : MIN_YEAR,
      endYear: years.length ? Math.max(...years) : MAX_YEAR,
      regionIds: [...new Set(p.coverage.map((c) => c.regionId))],
    });
  }
  const entries = buildSearchIndex(
    catalog,
    clean.flatMap((p) => p.events),
  );
  let interpretations: Manifest["interpretations"] = [];
  try {
    interpretations = JSON.parse(
      await readFile(join(inputRoot, "catalog/interpretations.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  let defaultInterpretationIds: string[] = [];
  try {
    defaultInterpretationIds = JSON.parse(
      await readFile(
        join(inputRoot, "catalog/default-interpretations.json"),
        "utf8",
      ),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  if (
    !Array.isArray(defaultInterpretationIds) ||
    defaultInterpretationIds.some(
      (id) => !interpretations.some((i) => i.id === id),
    )
  )
    throw new Error("默认编制版本必须来自已发布解释版本");
  if (features.length && !defaultInterpretationIds.length)
    throw new Error("发布疆域前须明确默认编制版本");
  for (const a of features.filter((t) =>
    defaultInterpretationIds.includes(t.properties.interpretationId),
  )) {
    if (
      features.some(
        (b) =>
          defaultInterpretationIds.includes(b.properties.interpretationId) &&
          a.properties.entityId === b.properties.entityId &&
          a.properties.relation === b.properties.relation &&
          a.properties.interpretationId !== b.properties.interpretationId &&
          compareDays(
            a.properties.validity.start.earliest,
            b.properties.validity.endExclusive.latest,
          ) < 0 &&
          compareDays(
            b.properties.validity.start.earliest,
            a.properties.validity.endExclusive.latest,
          ) < 0,
      )
    )
      throw new Error("默认编制版本存在同政权同时段的不同解释，请选定一种");
  }
  const manifest: Manifest = {
    version: createHash("sha256")
      .update(stable({ sourceText, interpretations, defaultInterpretationIds }))
      .digest("hex")
      .slice(0, 16),
    catalog: catalogResource,
    packages,
    defaultInterpretationIds,
    scopeVersion: "3",
    searchIndex: await store("search", [
      ...new Map(entries.map((e) => [`${e.kind}:${e.id}`, e])).values(),
    ]),
    interpretations,
    territorySlices: buildTerritorySlices(features),
  };
  let plateInputs: unknown[] = [];
  try {
    plateInputs = JSON.parse(
      await readFile(join(inputRoot, "catalog/map-plates.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  if (!Array.isArray(plateInputs)) throw new Error("参考图幅目录必须为数组");
  const mapPlates: NonNullable<Manifest["mapPlates"]> = [];
  for (const value of plateInputs) {
    const { file, sha256, ...metadata } = value as Record<string, unknown>;
    if (
      typeof file !== "string" ||
      !/^sources\/commons\/[a-z0-9-]+\.(png|svg)$/.test(file)
    )
      throw new Error("参考图幅路径不合法");
    const bytes = await readFile(join(inputRoot, file));
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (actualHash !== sha256) throw new Error(`参考图幅校验失败：${file}`);
    const path = `plate-${actualHash.slice(0, 16)}.${file.split(".").pop()}`;
    const plate = mapPlateSchema.parse({
      ...metadata,
      image: { path, sha256: actualHash },
    });
    const source = catalog.sources.find((s) => s.id === plate.sourceId);
    if (
      !source ||
      source.redistribution !== "allowed" ||
      source.license !== plate.license
    )
      throw new Error(`参考图幅来源或许可未核对：${plate.id}`);
    if (
      plate.entityIds?.some((id) => !catalog.entities.some((e) => e.id === id))
    )
      throw new Error(`参考图幅关联政权缺失：${plate.id}`);
    if (mapPlates.some((p) => p.id === plate.id))
      throw new Error("参考图幅编号重复");
    await writeFile(join(outputRoot, path), bytes);
    mapPlates.push(plate);
  }
  manifest.mapPlates = mapPlates;
  manifest.version = createHash("sha256")
    .update(
      stable({
        sourceText,
        interpretations,
        defaultInterpretationIds,
        mapPlates,
      }),
    )
    .digest("hex")
    .slice(0, 16);
  const temporary = join(outputRoot, `.manifest-${randomUUID()}.json`);
  await writeFile(temporary, JSON.stringify(manifest, null, 2));
  await rename(temporary, join(outputRoot, "manifest.json"));
  return manifest;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const arg = (key: string, fallback: string) => {
    const n = process.argv.indexOf(key);
    return n < 0 ? fallback : process.argv[n + 1];
  };
  try {
    const m = await publishDataset(
      arg("--input", "data"),
      arg("--output", "public/data"),
    );
    console.log(`发布本地资源 ${m.version}，${m.packages.length} 个数据包`);
  } catch (e) {
    console.error(String(e));
    process.exitCode = 1;
  }
}
