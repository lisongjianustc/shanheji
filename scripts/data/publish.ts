import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readDataset, validateDataset, stable } from "./validate";
import type { Manifest, Resource } from "../../src/data/manifest";
import { buildSearchIndex } from "../../src/features/search/index";
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
      startYear: years.length ? Math.min(...years) : 220,
      endYear: years.length ? Math.max(...years) : 907,
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
  const manifest: Manifest = {
    version: createHash("sha256").update(sourceText).digest("hex").slice(0, 16),
    catalog: catalogResource,
    packages,
    defaultInterpretationIds: interpretations.map((i) => i.id),
    scopeVersion: "1",
    searchIndex: await store("search", [
      ...new Map(entries.map((e) => [`${e.kind}:${e.id}`, e])).values(),
    ]),
    interpretations,
  };
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
