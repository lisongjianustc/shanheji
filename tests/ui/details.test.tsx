// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DetailPanel } from "../../src/features/details/DetailPanel";
import { makeScene } from "../fixtures/make";
afterEach(cleanup);
it("详情保留真实日期标签、来源和无确日提示，Escape关闭并归还焦点", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const view = render(
    <DetailPanel
      scene={makeScene()}
      selection={{ kind: "event", id: "test-event" }}
      onSelect={() => {}}
      onRequest={() => {}}
      onClose={close}
    />,
  );
  expect(screen.getByText("测试摘要")).toBeTruthy();
  expect(screen.getByText("300—300年")).toBeTruthy();
  expect(screen.getByText(/仅年或范围精度/)).toBeTruthy();
  expect(screen.getByText("测试来源")).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalled();
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
it("不输出危险来源链接", () => {
  const s = makeScene();
  s.catalog.sources[0].url = "javascript:alert(1)";
  render(
    <DetailPanel
      scene={s}
      selection={{ kind: "event", id: "test-event" }}
      onSelect={() => {}}
      onRequest={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.queryByRole("link")).toBeNull();
});
