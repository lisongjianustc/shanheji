// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TerritoryPanel } from "../../src/features/coverage/TerritoryPanel";
import { makeScene } from "../fixtures/make";
afterEach(cleanup);
it("selects dated administrative evidence without enabling claims", () => {
  const onRequest = vi.fn();
  render(
    <TerritoryPanel
      scene={makeScene()}
      slices={[
        {
          year: 661,
          entityId: "tang",
          interpretationId: "source-661",
          relations: ["administration", "claim"],
          regionIds: ["china-core"],
          featureCount: 3,
          disputed: true,
        },
      ]}
      interpretations={[]}
      onRequest={onRequest}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /查看661年图幅/ }));
  expect(onRequest.mock.calls[0][0].year).toBe(661);
  expect(onRequest.mock.calls[0][0].filters.relations).toEqual([
    "administration",
  ]);
  expect(onRequest.mock.calls[0][0].filters.interpretationIds).toEqual([
    "source-661",
  ]);
  expect(screen.getByText(/存在边界争议/)).toBeTruthy();
});
it("opens all polities for a year and clears a previous single-polity restriction", () => {
  const onRequest = vi.fn();
  render(
    <TerritoryPanel
      scene={makeScene()}
      slices={["wei", "shu", "wu"].map((entityId) => ({
        year: 262,
        entityId,
        interpretationId: "source-262",
        relations: ["administration"],
        regionIds: ["china-core"],
        featureCount: 1,
        disputed: true,
      }))}
      interpretations={[]}
      onRequest={onRequest}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "查看262年全部已录入政权" }),
  );
  const q = onRequest.mock.calls[0][0];
  expect(q.year).toBe(262);
  expect(q.filters.entityIds).toEqual([]);
  expect(q.filters.interpretationIds).toEqual([]);
  expect(q.filters.relations).toEqual([
    "control",
    "administration",
    "reconstruction",
  ]);
});
