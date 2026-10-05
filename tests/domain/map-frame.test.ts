import { sceneBounds } from "../../src/features/map/frame";
import { makeScene, makePackage, time } from "../fixtures/make";

it("includes a located event beyond the available polity outline", () => {
  const s = makeScene();
  s.territories = makePackage().territories;
  s.catalog.places[0].locations[0].geometry = {
    type: "Point",
    coordinates: [135, 35],
  };
  expect(sceneBounds(s)).toEqual([
    [109, 29],
    [135, 35],
  ]);
});
it("frames a point-only scene without creating territory", () => {
  const s = makeScene();
  s.territories = [];
  expect(sceneBounds(s)).toEqual([
    [110, 30],
    [110, 30],
  ]);
  expect(s.territories).toHaveLength(0);
});
it("does not frame unrelated or expired catalog locations", () => {
  const s = makeScene();
  s.territories = [];
  s.catalog.places[0].locations[0].validity = time(301);
  expect(sceneBounds(s)).toBeNull();
  s.catalog.places[0].locations[0].validity = time(300);
  s.events[0].placeIds = [];
  expect(sceneBounds(s)).toBeNull();
});
it("includes an explicitly sourced event region in the viewport", () => {
  const s = makeScene();
  s.territories = makePackage().territories;
  s.catalog.places[0].locations[0].geometry = {
    type: "Polygon",
    coordinates: [
      [
        [130, 34],
        [131, 34],
        [131, 36],
        [130, 36],
        [130, 34],
      ],
    ],
  };
  expect(sceneBounds(s)).toEqual([
    [109, 29],
    [131, 36],
  ]);
});
