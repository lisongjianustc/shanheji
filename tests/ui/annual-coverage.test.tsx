// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnnualCoveragePanel } from "../../src/features/coverage/AnnualCoveragePanel";
import { defaultQuery } from "../../src/domain/query";
import { makeScene, time } from "../fixtures/make";
afterEach(cleanup);
it("jumps to partial or missing spans without pretending source presence means completeness", () => {
  const scene = makeScene();
  scene.query = defaultQuery(302);
  const e = scene.catalog.entities[0];
  e.existence = time(300, 305);
  e.names = [{ text: "东晋", validity: e.existence, evidence: [] }];
  const onYear = vi.fn();
  render(
    <AnnualCoveragePanel
      scene={scene}
      slices={[
        {
          year: 302,
          entityId: e.id,
          interpretationId: "test",
          regionIds: e.regionIds,
          relations: ["reconstruction"],
          featureCount: 1,
          disputed: true,
          partial: true,
        },
      ]}
      defaults={["test"]}
      onYear={onYear}
    />,
  );
  expect(screen.getByTestId("annual-coverage-summary").textContent).toContain(
    "仅部分图幅 1 年 · 尚无范围 5 年",
  );
  fireEvent.click(screen.getByRole("button", { name: "302年 仅部分图幅" }));
  expect(onYear).toHaveBeenLastCalledWith(302);
  fireEvent.click(screen.getByRole("button", { name: "303—305年 尚无范围" }));
  expect(onYear).toHaveBeenLastCalledWith(303);
  fireEvent.change(screen.getByRole("textbox", { name: "查找逐年覆盖政权" }), {
    target: { value: "清" },
  });
  expect(screen.getByText("当前筛选没有匹配的已登记政权。")).toBeTruthy();
});
