import type { Scene, Query } from "../domain/types";
import type { HistoryRepository } from "../data/repository";
export interface Selection {
  kind: "entity" | "event" | "place";
  id: string;
}
export interface HistoryState {
  previewYear: number;
  committed: Scene | null;
  pending: { requestId: number; scene: Scene } | null;
  selection: Selection | null;
  playing: boolean;
  status: "idle" | "loading" | "staging" | "ready" | "error";
  error: string | null;
}
export interface HistoryController {
  getSnapshot(): HistoryState;
  subscribe(fn: () => void): () => void;
  preview(year: number): void;
  request(query: Query): Promise<void>;
  acceptRendered(id: number): void;
  select(value: Selection | null): void;
  setPlaying(v: boolean): void;
  dispose(): void;
}
export function createHistoryController(
  repository: HistoryRepository,
): HistoryController {
  let s: HistoryState = {
    previewYear: 589,
    committed: null,
    pending: null,
    selection: null,
    playing: false,
    status: "idle",
    error: null,
  };
  let serial = 0,
    abort: AbortController | null = null,
    disposed = false;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<HistoryState>) => {
    if (disposed) return;
    s = { ...s, ...patch };
    listeners.forEach((fn) => fn());
  };
  return {
    getSnapshot: () => s,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    preview(year) {
      if (Number.isInteger(year) && year >= 220 && year <= 907)
        update({ previewYear: year });
    },
    async request(query) {
      const requestId = ++serial;
      abort?.abort();
      abort = new AbortController();
      update({
        previewYear: query.year,
        status: "loading",
        pending: null,
        error: null,
      });
      try {
        const scene = await repository.loadScene(query, abort.signal);
        if (requestId === serial && !disposed)
          update({ pending: { requestId, scene }, status: "staging" });
      } catch (e) {
        if (requestId === serial && !disposed)
          update({
            status: "error",
            pending: null,
            error: e instanceof Error ? e.message : String(e),
            playing: false,
          });
      }
    },
    acceptRendered(id) {
      if (id !== serial || s.pending?.requestId !== id) return;
      update({
        committed: s.pending.scene,
        pending: null,
        status: "ready",
        error: null,
      });
    },
    select(value) {
      update({ selection: value, playing: false });
    },
    setPlaying(v) {
      update({ playing: v });
    },
    dispose() {
      abort?.abort();
      disposed = true;
      serial++;
      listeners.clear();
    },
  };
}
