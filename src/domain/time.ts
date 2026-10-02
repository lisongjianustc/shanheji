import type { Day, Validity } from "./types";
export function parseDay(value: string): Day {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("日期格式无效");
  const [y, m, d] = value.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1])
    throw new Error("日期不存在");
  return value;
}
export function classifyAt(
  v: Validity,
  at: Day,
): "certain" | "possible" | "outside" {
  parseDay(at);
  if (at < v.start.earliest || at >= v.endExclusive.latest) return "outside";
  if (at >= v.start.latest && at < v.endExclusive.earliest) return "certain";
  return "possible";
}
export const yearDay = (year: number, suffix = "01-01"): Day =>
  `${String(year).padStart(4, "0")}-${suffix}`;
export const yearOf = (day: Day) => Number(day.slice(0, 4));
export function overlapsYear(v: Validity, year: number) {
  return (
    v.start.earliest < yearDay(year + 1) &&
    v.endExclusive.latest > yearDay(year)
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
export function yearSpan(v: Validity) {
  return `${yearOf(v.start.earliest)}—${yearOf(v.endExclusive.latest.slice(5) === "01-01" ? yearDay(yearOf(v.endExclusive.latest) - 1) : v.endExclusive.latest)}年`;
}
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
  if (!overlapsYear(v, year + 1)) return "结束于本年";
  return "持续事件";
}
