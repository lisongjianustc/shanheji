import { useMemo, useState } from "react";
import { buildAnnualCoverage } from "../../domain/annualCoverage";
import { formatYearRange } from "../../domain/chronology";
import type { Scene } from "../../domain/types";
import type { TerritorySlice } from "../../domain/territorySlices";
const statusLabels = {
  available: "有范围资料",
  partial: "仅部分图幅",
  missing: "尚无范围",
};
export function AnnualCoveragePanel({
  scene,
  slices,
  defaults,
  onYear,
}: {
  scene: Scene;
  slices: TerritorySlice[];
  defaults: string[];
  onYear: (year: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const rows = useMemo(
    () =>
      buildAnnualCoverage(scene.catalog, slices, scene.query.filters, defaults),
    [scene.catalog, slices, scene.query.filters, defaults],
  );
  const matching = rows.filter((r) =>
    r.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const selected =
    matching.find((r) => r.id === selectedId) ??
    matching.find(
      (r) => r.startYear <= scene.query.year && scene.query.year <= r.endYear,
    ) ??
    matching[0];
  return (
    <section className="annual-coverage" aria-label="逐年资料清单">
      <h3>逐年资料清单</h3>
      <p className="empty-copy">
        按当前政权、地区、关系和来源筛选统计；“有范围资料”不代表完整疆界。部分图幅仍有疆域缺口。逐年清单不使用近年参考，也不证明全年实控。
      </p>
      <label>
        查找政权
        <input
          aria-label="查找逐年覆盖政权"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="如东晋、唐、清"
        />
      </label>
      {selected ? (
        <>
          <label>
            政权阶段
            <select
              aria-label="逐年覆盖政权阶段"
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {matching.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {formatYearRange(r.startYear, r.endYear)}
                </option>
              ))}
            </select>
          </label>
          <div className="annual-summary" data-testid="annual-coverage-summary">
            <strong>
              {selected.name} ·{" "}
              {formatYearRange(selected.startYear, selected.endYear)}
            </strong>
            <p>
              有范围资料 {selected.availableYears} 年 · 仅部分图幅{" "}
              {selected.partialYears} 年 · 尚无范围 {selected.missingYears} 年
            </p>
          </div>
          <p className="empty-copy">
            点击区间查看首年地图；可用下方时间轴逐年检查。
          </p>
          <ul className="annual-spans">
            {selected.spans.map((span) => (
              <li key={span.startYear}>
                <button
                  type="button"
                  aria-label={`${formatYearRange(span.startYear, span.endYear)} ${statusLabels[span.status]}`}
                  className={`annual-span ${span.status}`}
                  aria-current={
                    scene.query.year >= span.startYear &&
                    scene.query.year <= span.endYear
                      ? "date"
                      : undefined
                  }
                  onClick={() => onYear(span.startYear)}
                >
                  <span>{formatYearRange(span.startYear, span.endYear)}</span>
                  <small>{statusLabels[span.status]}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty-copy">当前筛选没有匹配的已登记政权。</p>
      )}
    </section>
  );
}
