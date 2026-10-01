import type { Scene, Relation } from "../../domain/types";
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
  vassal: "臣属关系",
  influence: "影响范围",
  claim: "主张范围",
};
export function CoveragePanel({ scene }: { scene: Scene }) {
  return (
    <section className="coverage-panel">
      <h3>资料覆盖</h3>
      <p className="empty-copy">
        空白表示尚缺资料，不表示当时没有政权或事件。底图为现代自然地理参考。
      </p>
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
          <small>
            {c.startYear}—{c.endYear}年
          </small>
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
