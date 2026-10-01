// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SearchPanel } from "../../src/features/search/SearchPanel";
import { CoveragePanel } from "../../src/features/coverage/CoveragePanel";
import { makeScene } from "../fixtures/make";
afterEach(cleanup);
it("跨时代搜索结果显式显示跳转年份", () => {
  const select = vi.fn();
  render(
    <SearchPanel
      entries={[
        {
          id: "a",
          kind: "event",
          label: "另年事件",
          aliases: [],
          startYear: 618,
          endYear: 618,
          regionIds: [],
        },
      ]}
      year={300}
      onChoose={select}
    />,
  );
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "另年" },
  });
  fireEvent.click(screen.getByRole("button", { name: /另年事件/ }));
  expect(select.mock.calls[0][0].startYear).toBe(618);
  expect(screen.getByText(/跳至618/)).toBeTruthy();
});
it("覆盖面板明确区分缺口和核验状态", () => {
  const s = makeScene();
  s.coverage = [
    {
      id: "a",
      regionId: "china-core",
      startYear: 220,
      endYear: 907,
      topic: "territory",
      status: "missing",
      evidence: [],
      reason: "尚缺图幅",
    },
  ];
  render(<CoveragePanel scene={s} />);
  expect(screen.getByText("尚缺图幅")).toBeTruthy();
  expect(screen.getByText(/资料缺失/)).toBeTruthy();
});
