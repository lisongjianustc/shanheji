import { createRepository } from "../../src/data/repository";
import { makeQuery, makeCatalog, makePackage } from "../fixtures/make";
import { createHash } from "node:crypto";
function resources(badHash = false) {
  const catalog = JSON.stringify(makeCatalog()),
    pack = JSON.stringify(makePackage());
  const hash = (v: string) => createHash("sha256").update(v).digest("hex");
  const manifest = {
    version: "1",
    catalog: {
      path: "catalog.json",
      sha256: badHash ? "0".repeat(64) : hash(catalog),
    },
    packages: [
      {
        id: "a",
        version: "1",
        path: "a.json",
        sha256: hash(pack),
        startYear: 220,
        endYear: 907,
        regionIds: ["china-core"],
      },
    ],
    defaultInterpretationIds: ["test-interpretation"],
    scopeVersion: "1",
    searchIndex: { path: "search.json", sha256: hash("[]") },
    interpretations: [],
  };
  return new Map([
    ["/data/manifest.json", JSON.stringify(manifest)],
    ["/data/catalog.json", catalog],
    ["/data/a.json", pack],
  ]);
}
it("rejects a damaged resource hash", async () => {
  const r = resources(true);
  const repo = createRepository(
    "/data/",
    async (u) => new Response(r.get(String(u))),
  );
  await expect(
    repo.loadScene(makeQuery(), new AbortController().signal),
  ).rejects.toThrow();
});
it("fails if a required package is unavailable", async () => {
  const r = resources();
  const repo = createRepository("/data/", async (u) =>
    String(u).endsWith("a.json")
      ? new Response("", { status: 503 })
      : new Response(r.get(String(u))),
  );
  await expect(
    repo.loadScene(makeQuery(), new AbortController().signal),
  ).rejects.toThrow();
});
it("loads valid resources and returns the requested scene", async () => {
  const r = resources();
  const repo = createRepository(
    "/data/",
    async (u) => new Response(r.get(String(u))),
  );
  const scene = await repo.loadScene(makeQuery(), new AbortController().signal);
  expect(scene.query?.year).toBe(300);
  expect(scene.events?.length).toBe(1);
});
it("stalled network requests time out with a retryable error", async () => {
  vi.useFakeTimers();
  try {
    const fetcher = vi.fn(
      (_u: any, options: any) =>
        new Promise<Response>((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(options.signal.reason),
          ),
        ),
    );
    const repo = createRepository("/data/", fetcher);
    const result = expect(
      repo.loadScene(makeQuery(), new AbortController().signal),
    ).rejects.toThrow(/超时/);
    await vi.advanceTimersByTimeAsync(15001);
    await result;
  } finally {
    vi.useRealTimers();
  }
});
