import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishDataset } from "../../scripts/data/publish";
import { makeCatalog, makePackage } from "../fixtures/make";
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "history-publish-"));
  await mkdir(join(root, "input/catalog"), { recursive: true });
  await mkdir(join(root, "input/packages/a"), { recursive: true });
  await mkdir(join(root, "output"));
  for (const [k, v] of Object.entries(makeCatalog()))
    await writeFile(join(root, `input/catalog/${k}.json`), JSON.stringify(v));
  await writeFile(
    join(root, "input/packages/a/package.json"),
    JSON.stringify(makePackage()),
  );
  await writeFile(join(root, "output/manifest.json"), "old-manifest");
});
afterEach(async () => rm(root, { recursive: true, force: true }));
it("rejects fixture data without replacing old manifest", async () => {
  await expect(
    publishDataset(join(root, "input"), join(root, "output")),
  ).rejects.toThrow();
  expect(await readFile(join(root, "output/manifest.json"), "utf8")).toBe(
    "old-manifest",
  );
});
it("rejects invalid source data without publishing a new manifest", async () => {
  await writeFile(join(root, "input/catalog/sources.json"), "[]");
  await expect(
    publishDataset(join(root, "input"), join(root, "output")),
  ).rejects.toThrow();
  expect(await readFile(join(root, "output/manifest.json"), "utf8")).toBe(
    "old-manifest",
  );
});
it("publishes only explicitly configured default interpretations", async () => {
  for (const k of ["sources", "entities", "places"])
    await writeFile(join(root, `input/catalog/${k}.json`), "[]");
  await writeFile(
    join(root, "input/packages/a/package.json"),
    JSON.stringify({
      id: "a",
      version: "1",
      territories: [],
      events: [],
      coverage: [],
    }),
  );
  await writeFile(
    join(root, "input/catalog/interpretations.json"),
    JSON.stringify([
      { id: "a", label: "A", reason: "A" },
      { id: "b", label: "B", reason: "B" },
    ]),
  );
  await writeFile(
    join(root, "input/catalog/default-interpretations.json"),
    '["a"]',
  );
  expect(
    (await publishDataset(join(root, "input"), join(root, "output")))
      .defaultInterpretationIds,
  ).toEqual(["a"]);
});

async function preparePlate() {
  const source = {
    ...makeCatalog().sources[0],
    id: "commons-plate",
    license: "CC BY-SA 4.0",
  };
  await writeFile(
    join(root, "input/catalog/sources.json"),
    JSON.stringify([source]),
  );
  for (const k of ["entities", "places"])
    await writeFile(join(root, `input/catalog/${k}.json`), "[]");
  await writeFile(
    join(root, "input/packages/a/package.json"),
    JSON.stringify({
      id: "a",
      version: "1",
      territories: [],
      events: [],
      coverage: [],
    }),
  );
  await mkdir(join(root, "input/sources/commons"), { recursive: true });
  const bytes = await readFile("data/sources/commons/china-572.png");
  await writeFile(join(root, "input/sources/commons/plate.png"), bytes);
  const { createHash } = await import("node:crypto");
  const plate = {
    id: "plate",
    year: 572,
    title: "参考图",
    sourceId: source.id,
    creator: "SY",
    edition: "2020",
    license: source.license,
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:China_Divisions_in_572.png",
    limitations: "未配准",
    width: 1588,
    height: 1123,
    file: "sources/commons/plate.png",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  await writeFile(
    join(root, "input/catalog/map-plates.json"),
    JSON.stringify([plate]),
  );
  return plate;
}
it("publishes a reference image unchanged and changes version with its metadata", async () => {
  const plate = await preparePlate();
  const m = await publishDataset(join(root, "input"), join(root, "output"));
  expect(m.mapPlates?.[0].year).toBe(572);
  expect(
    await readFile(join(root, "output", m.mapPlates![0].image.path)),
  ).toEqual(await readFile(join(root, "input", plate.file)));
  await writeFile(
    join(root, "input/catalog/map-plates.json"),
    JSON.stringify([{ ...plate, limitations: "新增边界争议说明" }]),
  );
  expect(
    (await publishDataset(join(root, "input"), join(root, "output"))).version,
  ).not.toBe(m.version);
});
it("rejects corrupted reference images before replacing the manifest", async () => {
  const plate = await preparePlate();
  await writeFile(join(root, "input", plate.file), "corrupted");
  await expect(
    publishDataset(join(root, "input"), join(root, "output")),
  ).rejects.toThrow("校验失败");
  expect(await readFile(join(root, "output/manifest.json"), "utf8")).toBe(
    "old-manifest",
  );
});
it("rejects reference images with unconfirmed redistribution permission", async () => {
  await preparePlate();
  const sources = JSON.parse(
    await readFile(join(root, "input/catalog/sources.json"), "utf8"),
  );
  sources[0].redistribution = "unknown";
  await writeFile(
    join(root, "input/catalog/sources.json"),
    JSON.stringify(sources),
  );
  await expect(
    publishDataset(join(root, "input"), join(root, "output")),
  ).rejects.toThrow("许可未核对");
  expect(await readFile(join(root, "output/manifest.json"), "utf8")).toBe(
    "old-manifest",
  );
});
