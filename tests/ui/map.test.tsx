// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HistoryMap } from "../../src/features/map/HistoryMap";
import { buildTerritoryLayers } from "../../src/features/map/layers";
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
