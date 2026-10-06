import { formatYearRange } from "../../domain/chronology";
import type { Scene, Relation } from "../../domain/types";
import { entityActiveAt, entityActiveInYear, nameAt } from "../../domain/time";
export function missingPolities(scene: Scene) {
  const { query, catalog, territories } = scene;
  const drawn = new Set(
    territories
      .filter(
        (t) =>
          t.properties.temporalSupport !== "snapshot" ||
          t.properties.snapshotYear === query.year,
      )
      .map((t) => t.properties.entityId),
  );
  return catalog.entities.filter(
    (e) =>
      (query.at
        ? entityActiveAt(e, query.at)
        : entityActiveInYear(e, query.year)) &&
      (!query.filters.entityIds.length ||
        query.filters.entityIds.includes(e.id)) &&
      (!query.filters.regionIds.length ||
        e.regionIds.some((r) => query.filters.regionIds.includes(r))) &&
      !drawn.has(e.id),
  );
}
export const regionLabels: Record<string, string> = {
  "china-core": "中国主要地区",
  steppe: "北方草原",
  korea: "朝鲜半岛",
  japan: "日本列岛",
  tibet: "青藏高原",
  "central-asia": "中亚及西域",
  "southeast-asia": "东南亚",
};
export const relationLabels: Record<Relation, string> = {
  control: "实际控制",
  administration: "行政设置",
  reconstruction: "疆域复原",
  vassal: "臣属关系",
  influence: "影响范围",
  claim: "主张范围",
};
export function CoveragePanel({
  scene,
  children,
}: {
  scene: Scene;
  children?: import("react").ReactNode;
}) {
  const missing = missingPolities(scene);
  return (
    <section className="coverage-panel">
      <h3>资料覆盖</h3>
      <p className="empty-copy">
        空白表示尚缺资料，不表示当时没有政权或事件。底图为现代自然地理参考。
      </p>
      {!!missing.length && (
        <div className="coverage-row" data-testid="missing-polities">
          <strong>当前筛选下，本年已登记政权无可用范围</strong>
          <p>
            {missing.map((e) => nameAt(e.names, scene.query.year)).join("、")}
          </p>
          <small>
            仅列目录中已登记的政权；已有范围也可能不完整。取消来源或关系筛选可查看其他资料。
          </small>
        </div>
      )}
      {children}
      {scene.coverage.map((c) => (
        <div className="coverage-row" key={c.id}>
          <span className={`coverage-status ${c.status}`}>
            {
              { verified: "已核验", pending: "待核验", missing: "资料缺失" }[
                c.status
              ]
            }
          </span>
          <strong>
            {regionLabels[c.regionId] ?? c.regionId} ·{" "}
            {{ territory: "疆域", event: "事件", place: "地点" }[c.topic]}
          </strong>
          <small>{formatYearRange(c.startYear, c.endYear)}</small>
          <p>{c.reason}</p>
        </div>
      ))}
      {!scene.coverage.length && (
        <p className="empty-copy">当前筛选尚无覆盖记录。</p>
      )}
      <h3>地图图例</h3>
      <p className="legend-line">━━ 资料所标边界　┄┄ 近似／争议边界</p>
      <p className="empty-copy">
        边界随有据切片切换，不在未知年份之间插值。近年参考模式会显示实际参考年份。
      </p>
      <ul className="relation-legend">
        {Object.entries(relationLabels).map(([id, label]) => (
          <li key={id}>
            {label}：
            {
              {
                control: "直接统治或有效占领",
                administration: "有建制记录，不等于持续控制",
                reconstruction: "研究来源的年代区间轮廓，非确日实控审定",
                vassal: "隶属关系，不等于本土疆域",
                influence: "交往或影响范围",
                claim: "主张但未证实有效控制",
              }[id]
            }
          </li>
        ))}
      </ul>
    </section>
  );
}
