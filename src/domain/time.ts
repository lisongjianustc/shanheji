import type { Day, Validity } from "./types";
import {
  isHistoricalYear,
  nextYear,
  previousYear,
  formatYearRange,
} from "./chronology";
const dateParts = (value: string) => {
  const match = /^(-?\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("日期格式无效");
  return match.slice(1).map(Number);
};
export function parseDay(value: string): Day {
  const [y, m, d] = dateParts(value);
  // Proleptic Gregorian calendar is a computational boundary, not an ancient calendar claim.
  const astronomicalYear = y < 0 ? y + 1 : y;
  const leap =
    astronomicalYear % 4 === 0 &&
    (astronomicalYear % 100 !== 0 || astronomicalYear % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!isHistoricalYear(y) || m < 1 || m > 12 || d < 1 || d > days[m - 1])
    throw new Error("日期不存在");
  return value;
}
export function compareDays(a: Day, b: Day) {
  const aa = dateParts(parseDay(a)),
    bb = dateParts(parseDay(b));
  return aa[0] - bb[0] || aa[1] - bb[1] || aa[2] - bb[2];
}
export function classifyAt(
  v: Validity,
  at: Day,
): "certain" | "possible" | "outside" {
  parseDay(at);
  if (
    compareDays(at, v.start.earliest) < 0 ||
    compareDays(at, v.endExclusive.latest) >= 0
  )
    return "outside";
  if (
    compareDays(at, v.start.latest) >= 0 &&
    compareDays(at, v.endExclusive.earliest) < 0
  )
    return "certain";
  return "possible";
}
export function yearDay(year: number, suffix = "01-01"): Day {
  if (!isHistoricalYear(year) || Math.abs(year) > 9999)
    throw new Error("无效历史年份");
  return parseDay(
    `${year < 0 ? "-" : ""}${String(Math.abs(year)).padStart(4, "0")}-${suffix}`,
  );
}
export const yearOf = (day: Day) => dateParts(parseDay(day))[0];
export const lastYear = (v: Validity) =>
  v.endExclusive.latest.endsWith("-01-01")
    ? previousYear(yearOf(v.endExclusive.latest))
    : yearOf(v.endExclusive.latest);
export function overlapsYear(v: Validity, year: number) {
  return (
    compareDays(v.start.earliest, yearDay(nextYear(year))) < 0 &&
    compareDays(v.endExclusive.latest, yearDay(year)) > 0
  );
}
export function nameAt(
  names: { text: string; validity: Validity }[],
  year: number,
) {
  return (
    names.find((n) => overlapsYear(n.validity, year))?.text ??
    names[0]?.text ??
    "未命名"
  );
}
export const yearSpan = (v: Validity) =>
  formatYearRange(yearOf(v.start.earliest), lastYear(v));
export function entityActiveInYear(e: import("./types").Entity, year: number) {
  return (e.activePeriods ?? [e.existence]).some((v) => overlapsYear(v, year));
}
export function entityActiveAt(e: import("./types").Entity, at: Day) {
  return (e.activePeriods ?? [e.existence]).some(
    (v) => classifyAt(v, at) !== "outside",
  );
}
export function eventPhase(v: Validity, year: number) {
  if (!overlapsYear(v, year)) return "所选年份之外";
  const uncertain =
    v.start.earliest !== v.start.latest ||
    v.endExclusive.earliest !== v.endExclusive.latest;
  if (uncertain) return "可能处于事件范围内";
  if (year === yearOf(v.start.earliest)) return "始见于本年";
  if (!overlapsYear(v, nextYear(year))) return "结束于本年";
  return "持续事件";
}
