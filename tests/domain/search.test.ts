import {
  buildSearchIndex,
  searchEntries,
} from "../../src/features/search/index";
import { makeCatalog, makePackage, time } from "../fixtures/make";
it("同名对象保留不同身份，当前年份优先", () => {
  const c = makeCatalog();
  c.entities[0].existence = time(500, 520);
  c.entities.push({ ...c.entities[0], id: "other", existence: time(300, 320) });
  expect(
    searchEntries(buildSearchIndex(c, []), "测试国", 310).map((e) => e.id),
  ).toEqual(["other", "test-polity"]);
});
it("异名找到同一地点；年中结束的事件不丢失末年", () => {
  const c = makeCatalog();
  c.places[0].names.push({ ...c.places[0].names[0], text: "异名城" });
  const e = makePackage().events[0];
  e.validity.endExclusive = { earliest: "0301-06-01", latest: "0301-06-01" };
  const index = buildSearchIndex(c, [e, e]);
  expect(searchEntries(index, "异名", 300)[0].id).toBe("test-place");
  expect(index.filter((i) => i.kind === "event")).toHaveLength(1);
  expect(index.find((i) => i.kind === "event")?.endYear).toBe(301);
});
it("事件导航遵守政权和类型筛选", () => {
  const c = makeCatalog(),
    e = makePackage().events[0];
  const index = buildSearchIndex(c, [e]);
  expect(index.find((i) => i.kind === "event")).toMatchObject({
    entityIds: ["test-polity"],
    eventKind: "political",
  });
});
it("historical aliases retain their own period when jumping to a renamed dynasty", () => {
  const c = makeCatalog();
  c.entities[0].existence = time(1206, 1368);
  c.entities[0].names = [
    { text: "蒙古政权", validity: time(1206, 1270), evidence: [] },
    { text: "元朝", validity: time(1271, 1368), evidence: [] },
  ];
  expect(searchEntries(buildSearchIndex(c, []), "元朝", 661)[0]).toMatchObject({
    label: "元朝",
    startYear: 1271,
  });
});
