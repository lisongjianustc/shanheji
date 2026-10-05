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

import {
  compareDays,
  yearDay,
  yearOf,
  overlapsYear,
  yearSpan,
} from "../../src/domain/time";
import {
  nextYear,
  previousYear,
  yearOrdinal,
  yearFromOrdinal,
} from "../../src/domain/chronology";
import { validitySchema } from "../../src/domain/schema";
it("orders BCE chronologically, rather than lexically", () => {
  expect(compareDays("-2100-01-01", "-1600-01-01")).toBeLessThan(0);
  expect(compareDays("-0001-12-31", "0001-01-01")).toBeLessThan(0);
  expect(yearDay(-221)).toBe("-0221-01-01");
  expect(yearOf("-0221-05-12")).toBe(-221);
});
it.each(["0000-01-01", "-0000-01-01", "-221-01-01"])(
  "rejects year zero or unpadded BCE %s",
  (d) => expect(() => parseDay(d)).toThrow(),
);
it("crosses the era boundary without year zero", () => {
  expect(nextYear(-1)).toBe(1);
  expect(previousYear(1)).toBe(-1);
  expect(yearFromOrdinal(yearOrdinal(-1) + 1)).toBe(1);
  expect(() => yearDay(0)).toThrow();
  const interval: Validity = {
    start: { earliest: "-0002-01-01", latest: "-0002-01-01" },
    endExclusive: { earliest: "0001-01-01", latest: "0001-01-01" },
    precision: "range",
    label: "前2年至前1年",
  };
  expect(overlapsYear(interval, -1)).toBe(true);
  expect(overlapsYear(interval, 1)).toBe(false);
  expect(yearSpan(interval)).toBe("公元前2—1年");
  expect(validitySchema.safeParse(interval).success).toBe(true);
  expect(
    validitySchema.safeParse({
      ...interval,
      start: { earliest: "-0001-01-01", latest: "-0002-01-01" },
    }).success,
  ).toBe(false);
});
it("schema reports malformed dates without throwing outside safeParse", () => {
  expect(
    validitySchema.safeParse({
      ...v,
      start: { earliest: "-0000-01-01", latest: "-0000-01-01" },
    }).success,
  ).toBe(false);
});
