/** Historical years: -1 = 1 BCE, 1 = 1 CE; there is no year zero. */
export const MIN_YEAR = -2100;
export const MAX_YEAR = 1912;
export const isHistoricalYear = (year: number) =>
  Number.isInteger(year) && year !== 0;
export const isSupportedYear = (year: number) =>
  isHistoricalYear(year) && year >= MIN_YEAR && year <= MAX_YEAR;
export const clampYear = (year: number) =>
  Math.max(MIN_YEAR, Math.min(MAX_YEAR, year === 0 ? 1 : year));
export const yearOrdinal = (year: number) => (year < 0 ? year + 1 : year);
export const yearFromOrdinal = (n: number) => (n <= 0 ? n - 1 : n);
export const nextYear = (year: number) => (year === -1 ? 1 : year + 1);
export const previousYear = (year: number) => (year === 1 ? -1 : year - 1);
export const formatYear = (year: number) =>
  `${year < 0 ? "公元前" : ""}${Math.abs(year)}年`;
export const formatYearRange = (start: number, end: number) =>
  start === end
    ? formatYear(start)
    : start < 0 && end < 0
      ? `公元前${Math.abs(start)}—${Math.abs(end)}年`
      : start < 0
        ? `${formatYear(start)}—公元${end}年`
        : `${start}—${end}年`;
export const TIME_WINDOWS = [
  { id: "all", label: "全历史", start: MIN_YEAR, end: MAX_YEAR },
  { id: "early", label: "夏商西周", start: MIN_YEAR, end: -771 },
  { id: "zhou", label: "东周 · 春秋战国", start: -770, end: -222 },
  { id: "han", label: "秦汉", start: -221, end: 219 },
  { id: "medieval", label: "三国至隋唐", start: 220, end: 907 },
  { id: "song", label: "五代 · 宋辽金元", start: 907, end: 1367 },
  { id: "ming", label: "明代", start: 1368, end: 1643 },
  { id: "qing", label: "清代", start: 1644, end: MAX_YEAR },
] as const;
export const windowForYear = (year: number) =>
  TIME_WINDOWS.slice(1)
    .reverse()
    .find((w) => year >= w.start && year <= w.end) ?? TIME_WINDOWS[0];
