import { buildEventLocations } from "../../src/features/details/eventModel";
import { makeScene, time } from "../fixtures/make";
it("无坐标不放置原点，重复事件不重复计数", () => {
  const s = makeScene();
  s.events[0].placeIds = [];
  s.events.push(s.events[0]);
  const r = buildEventLocations(s);
  expect(r.features.features).toHaveLength(0);
  expect(r.unlocatedEventIds).toEqual(["test-event"]);
});
it("只使用与事件及选中年份相交的位置，多地点保留关联", () => {
  const s = makeScene();
  s.catalog.places.push({ ...s.catalog.places[0], id: "second" });
  s.events[0].placeIds.push("second");
  s.catalog.places[0].locations.unshift({
    ...s.catalog.places[0].locations[0],
    validity: time(900),
    geometry: { type: "Point", coordinates: [1, 1] },
  });
  const r = buildEventLocations(s);
  expect(r.features.features).toHaveLength(2);
  expect(r.features.features[0].geometry.coordinates).toEqual([110, 30]);
});
it("区域地点仅画范围，不伪造事件发生点", () => {
  const s = makeScene();
  s.catalog.places[0].locations[0].geometry = {
    type: "Polygon",
    coordinates: [
      [
        [100, 20],
        [101, 20],
        [101, 21],
        [100, 20],
      ],
    ],
  };
  const r = buildEventLocations(s);
  expect(r.features.features).toHaveLength(0);
  expect(r.areaFeatures.features).toHaveLength(1);
  expect(r.unlocatedEventIds).toHaveLength(0);
});
