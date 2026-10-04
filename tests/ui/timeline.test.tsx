// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Timeline } from "../../src/features/timeline/Timeline";
import { useState } from "react";
import { makeCatalog, makeReadyState } from "../fixtures/make";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("refuses invalid years and leaves current view untouched", () => {
  let requested = 300;
  render(
    <Timeline
      state={makeReadyState()}
      catalog={makeCatalog()}
      onPreview={() => {}}
      onRequest={(q) => {
        requested = q.year;
      }}
      onPlaying={() => {}}
    />,
  );
  const input = screen.getByRole("spinbutton", { name: "年份" });
  fireEvent.change(input, { target: { value: "908" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getByRole("alert")).toBeVisible();
  expect(requested).toBe(300);
  fireEvent.change(input, { target: { value: "220" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(requested).toBe(220);
});
it("does not queue playback while a frame is loading", () => {
  vi.useFakeTimers();
  let requested = 300;
  render(
    <Timeline
      state={{ ...makeReadyState(), status: "loading", playing: true }}
      catalog={makeCatalog()}
      onPreview={() => {}}
      onRequest={(q) => {
        requested = q.year;
      }}
      onPlaying={() => {}}
    />,
  );
  vi.advanceTimersByTime(5000);
  expect(requested).toBe(300);
});
it("stops playback at the right endpoint", () => {
  vi.useFakeTimers();
  let playing = true;
  render(
    <Timeline
      state={{ ...makeReadyState(907), playing: true }}
      catalog={makeCatalog()}
      onPreview={() => {}}
      onRequest={() => {}}
      onPlaying={(v) => {
        playing = v;
      }}
    />,
  );
  vi.advanceTimersByTime(1000);
  expect(playing).toBe(false);
});
it("pauses on an available territory evidence year", () => {
  vi.useFakeTimers();
  const onPlaying = vi.fn(),
    onRequest = vi.fn();
  render(
    <Timeline
      state={{ ...makeReadyState(660), playing: true }}
      catalog={makeCatalog()}
      territoryYears={[661]}
      onPreview={() => {}}
      onRequest={onRequest}
      onPlaying={onPlaying}
    />,
  );
  vi.advanceTimersByTime(1000);
  expect(onRequest.mock.calls[0][0].year).toBe(661);
  expect(onPlaying).toHaveBeenCalledWith(false);
});
it("requests the latest drag year before release, then commits immediately", () => {
  vi.useFakeTimers();
  const onRequest = vi.fn(),
    onPlaying = vi.fn();
  function DragHarness() {
    const [state, setState] = useState(makeReadyState());
    return (
      <Timeline
        state={state}
        catalog={makeCatalog()}
        onPreview={(previewYear) => setState({ ...state, previewYear })}
        onRequest={onRequest}
        onPlaying={onPlaying}
      />
    );
  }
  render(<DragHarness />);
  const slider = screen.getByRole("slider", { name: "拖动年份" });
  fireEvent.change(slider, { target: { value: "660" } });
  vi.advanceTimersByTime(50);
  fireEvent.change(slider, { target: { value: "661" } });
  vi.advanceTimersByTime(50);
  expect(onRequest.mock.calls[0][0].year).toBe(661);
  expect(onPlaying).toHaveBeenCalledWith(false);
  fireEvent.change(slider, { target: { value: "662" } });
  fireEvent.pointerUp(slider);
  expect(onRequest.mock.calls.at(-1)![0].year).toBe(662);
  const n = onRequest.mock.calls.length;
  vi.advanceTimersByTime(200);
  expect(onRequest).toHaveBeenCalledTimes(n);
});
it("offers visible territory nodes and includes them in next-node navigation", () => {
  const onRequest = vi.fn();
  render(
    <Timeline
      state={makeReadyState(660)}
      catalog={makeCatalog()}
      territoryYears={[661]}
      eventYears={[668]}
      onPreview={() => {}}
      onRequest={onRequest}
      onPlaying={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "下一节点" }));
  expect(onRequest.mock.calls[0][0].year).toBe(661);
  fireEvent.click(screen.getByRole("button", { name: "跳至661年疆域" }));
  expect(onRequest.mock.calls[1][0].year).toBe(661);
});
