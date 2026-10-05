// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HistoryMap } from "../../src/features/map/HistoryMap";
import {
  buildTerritoryLayers,
  buildTerritoryBorders,
} from "../../src/features/map/layers";
import { makeScene, makePackage } from "../fixtures/make";
afterEach(cleanup);
it("provides readable fallback when WebGL is unavailable", () => {
  render(
    <HistoryMap
      scene={makeScene()}
      pending={null}
      onRendered={() => {}}
      onSelect={() => {}}
      onUnavailable={() => {}}
    />,
  );
  expect(screen.getByText(/地图暂不可用/)).toBeVisible();
});
it("preserves identity and uncertainty in rendered territory features", () => {
  const s = makeScene();
  s.territories = makePackage().territories;
  const f = buildTerritoryLayers(s).features[0];
  expect(f?.properties?.entityId).toBe("test-polity");
  expect(f?.properties?.displayColor).toBe("#567766");
  expect(f?.properties?.approximate).toBe(true);
});
it("does not fill claims or vassal relations as controlled territory", () => {
  const s = makeScene();
  s.territories = makePackage().territories;
  for (const relation of ["claim", "vassal", "influence"] as const) {
    s.territories[0].properties.relation = relation;
    expect(buildTerritoryLayers(s).features[0].properties?.fillOpacity).toBe(0);
  }
});

it("does not turn a partial source extent into a historical border", () => {
  const s = makeScene();
  s.territories = makePackage().territories;
  const boundary = {
    type: "MultiLineString" as const,
    coordinates: [
      [
        [105, 30],
        [106, 31],
      ],
    ],
  };
  s.territories[0].properties.compilation.boundaryGeometry = boundary;
  s.territories[0].properties.compilation.extent = "partial-source";
  expect(buildTerritoryBorders(s).features[0].geometry).toEqual(boundary);
  expect(buildTerritoryBorders(s).features[0].properties?.entityId).toBe(
    "test-polity",
  );
  delete s.territories[0].properties.compilation.boundaryGeometry;
  delete s.territories[0].properties.compilation.extent;
  expect(buildTerritoryBorders(s).features[0].geometry.coordinates).toEqual(
    s.territories[0].geometry.type === "Polygon"
      ? s.territories[0].geometry.coordinates
      : s.territories[0].geometry.coordinates.flat(),
  );
});
