// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Timeline } from "../../src/features/timeline/Timeline";
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
