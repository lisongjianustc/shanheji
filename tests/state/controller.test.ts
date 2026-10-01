import { createHistoryController } from "../../src/state/controller";
import { makeQuery, makeScene } from "../fixtures/make";
import type { Scene } from "../../src/domain/types";
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
it("latest request wins even if previous fetch ignores cancellation", async () => {
  const a = deferred<Scene>(),
    b = deferred<Scene>();
  let n = 0;
  const c = createHistoryController({
    loadScene: () => (++n === 1 ? a.promise : b.promise),
  });
  const first = c.request(makeQuery(300)),
    last = c.request(makeQuery(400));
  b.resolve(makeScene(400));
  await last;
  c.acceptRendered(c.getSnapshot().pending?.requestId ?? 0);
  a.resolve(makeScene(300));
  await first;
  expect(c.getSnapshot().committed?.query.year).toBe(400);
});
it("keeps the old scene on fetch failure and stops playback", async () => {
  let fail = false;
  const c = createHistoryController({
    loadScene: async (q) => {
      if (fail) throw new Error("离线");
      return makeScene(q.year);
    },
  });
  await c.request(makeQuery(300));
  c.acceptRendered(c.getSnapshot().pending?.requestId ?? 0);
  c.setPlaying(true);
  fail = true;
  await c.request(makeQuery(400));
  expect(c.getSnapshot().committed?.query.year).toBe(300);
  expect(c.getSnapshot().status).toBe("error");
  expect(c.getSnapshot().playing).toBe(false);
});
it("selection pauses playback and previews do not change committed data", async () => {
  const c = createHistoryController({
    loadScene: async (q) => makeScene(q.year),
  });
  await c.request(makeQuery(300));
  c.acceptRendered(c.getSnapshot().pending?.requestId ?? 0);
  c.setPlaying(true);
  c.preview(400);
  c.select({ kind: "event", id: "test-event" });
  expect(c.getSnapshot().selection?.id).toBe("test-event");
  expect(c.getSnapshot().playing).toBe(false);
  expect(c.getSnapshot().committed?.query.year).toBe(300);
});
it("rejects an obsolete map acknowledgement", async () => {
  const c = createHistoryController({
    loadScene: async (q) => makeScene(q.year),
  });
  await c.request(makeQuery(300));
  const old = c.getSnapshot().pending?.requestId ?? 0;
  await c.request(makeQuery(400));
  c.acceptRendered(old);
  expect(c.getSnapshot().committed).toBeNull();
  c.acceptRendered(c.getSnapshot().pending?.requestId ?? 0);
  expect(c.getSnapshot().committed?.query.year).toBe(400);
});
