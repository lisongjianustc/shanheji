import { parseDay, classifyAt } from "../../src/domain/time";
import type { Validity } from "../../src/domain/types";
const v: Validity = {
  start: { earliest: "0304-01-01", latest: "0304-12-31" },
  endExclusive: { earliest: "0320-01-01", latest: "0320-01-01" },
  precision: "year",
  label: "304年开始",
};
it.each([
  ["0303-12-31", "outside"],
  ["0304-06-01", "possible"],
  ["0305-01-01", "certain"],
  ["0320-01-01", "outside"],
])("time classification %s", (d, want) => expect(classifyAt(v, d)).toBe(want));
it.each(["0300-02-29", "0400-02-30", "0400-13-01", "400-01-01", "0400-00-10"])(
  "rejects invalid day %s",
  (d) => expect(() => parseDay(d)).toThrow(),
);
it("permits Gregorian leap year computational boundary", () =>
  expect(parseDay("0400-02-29")).toBe("0400-02-29"));
