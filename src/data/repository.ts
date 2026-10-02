import type { Query, Scene, SearchEntry, Catalog } from "../domain/types";
import { catalogSchema, packageSchema } from "../domain/schema";
import { queryScene } from "../domain/query";
import { manifestSchema, type Manifest, type Resource } from "./manifest";
export interface HistoryRepository {
  loadScene(query: Query, signal: AbortSignal): Promise<Scene>;
}
export interface Repository extends HistoryRepository {
  overview(
    signal: AbortSignal,
  ): Promise<{ catalog: Catalog; manifest: Manifest; index: SearchEntry[] }>;
}
export function createRepository(
  base = "/data/",
  fetcher: typeof fetch = fetch,
): Repository {
  const cache = new Map<string, unknown>();
  let manifest: Manifest | null = null;
  async function read(path: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const requestAbort = new AbortController();
    const relay = () => requestAbort.abort(signal.reason);
    signal.addEventListener("abort", relay, { once: true });
    const timer = setTimeout(
      () => requestAbort.abort(new Error("资料加载超时，请重试")),
      15000,
    );
    try {
      const response = await fetcher(`${base}${path}`, {
        signal: requestAbort.signal,
      });
      if (!response.ok)
        throw new Error(`资料加载失败（${response.status}）：${path}`);
      return await response.text();
    } catch (e) {
      if (requestAbort.signal.aborted) throw requestAbort.signal.reason;
      throw e;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", relay);
    }
  }
  async function getManifest(signal: AbortSignal) {
    if (!manifest)
      manifest = manifestSchema.parse(
        JSON.parse(await read("manifest.json", signal)),
      );
    return manifest;
  }
  async function resource(ref: Resource, signal: AbortSignal) {
    signal.throwIfAborted();
    if (cache.has(ref.sha256)) return cache.get(ref.sha256);
    const body = await read(ref.path, signal);
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== ref.sha256)
      throw new Error(`资料完整性校验失败：${ref.path}`);
    const value = JSON.parse(body);
    signal.throwIfAborted();
    cache.set(ref.sha256, value);
    return value;
  }
  return {
    async loadScene(query, signal) {
      const m = await getManifest(signal);
      const c = catalogSchema.parse(await resource(m.catalog, signal));
      const selected = m.packages.filter(
        (p) =>
          (query.filters.nearbyReference ||
            (p.startYear <= query.year && p.endYear >= query.year)) &&
          (!query.filters.regionIds.length ||
            p.regionIds.some((r) => query.filters.regionIds.includes(r))),
      );
      const packs = await Promise.all(
        selected.map(async (p) => {
          const pack = packageSchema.parse(await resource(p, signal));
          if (pack.id !== p.id || pack.version !== p.version)
            throw new Error(`数据包版本不匹配：${p.id}`);
          return pack;
        }),
      );
      signal.throwIfAborted();
      return queryScene(c, packs, query, m.defaultInterpretationIds);
    },
    async overview(signal) {
      const m = await getManifest(signal);
      return {
        catalog: catalogSchema.parse(await resource(m.catalog, signal)),
        manifest: m,
        index: (await resource(m.searchIndex, signal)) as SearchEntry[],
      };
    },
  };
}
