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
