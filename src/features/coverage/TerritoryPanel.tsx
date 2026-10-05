import type { Scene, Query } from "../../domain/types";
import type { TerritorySlice } from "../../domain/territorySlices";
import type { Manifest, MapPlate } from "../../data/manifest";
import { DEFAULT_FILTERS } from "../../domain/query";
import { nameAt } from "../../domain/time";
import { relationLabels } from "./CoveragePanel";
export function TerritoryPanel({
  scene,
  slices,
  interpretations,
  onRequest,
  plates = [],
  onOpenPlate,
}: {
  scene: Scene;
  slices: TerritorySlice[];
  interpretations: Manifest["interpretations"];
  onRequest: (q: Query) => void;
  plates?: MapPlate[];
  onOpenPlate?: (plate: MapPlate) => void;
}) {
  return (
    <section className="territory-panel">
      <h2>可用疆域图幅</h2>
      <p className="empty-copy">
        按图幅标示年份查看。资料节点不等于边界实际变化年，空缺年份不外推。
      </p>
      {!slices.length && <p>尚无可用疆域图幅。</p>}
      {[...new Set(slices.map((s) => s.year))].map((year) => (
        <button
          key={year}
          onClick={() =>
            onRequest({
              year,
              at: null,
              snapshotId: null,
              filters: structuredClone(DEFAULT_FILTERS),
            })
          }
        >
          查看{year}年全部已录入政权
        </button>
      ))}
      {slices.map((s) => {
        const version = interpretations.find(
          (i) => i.id === s.interpretationId,
        );
        const entity = scene.catalog.entities.find((e) => e.id === s.entityId);
        return (
          <article
            className="territory-slice"
            key={`${s.year}-${s.entityId}-${s.interpretationId}`}
          >
            <strong>
              {s.year} 年 · {entity ? nameAt(entity.names, s.year) : s.entityId}
            </strong>
            <p>{version?.label ?? s.interpretationId}</p>
            <small>
              {s.relations.map((r) => relationLabels[r]).join("／")} ·{" "}
              {s.featureCount} 条范围
            </small>
            {s.disputed && (
              <p className="evidence-note">
                存在边界争议，仅呈现此来源的编制版本；未经历史专家审定。
              </p>
            )}
            <button
              onClick={() =>
                onRequest({
                  year: s.year,
                  at: null,
                  snapshotId: null,
                  filters: {
                    ...structuredClone(DEFAULT_FILTERS),
                    entityIds: [s.entityId],
                    interpretationIds: [s.interpretationId],
                    relations: s.relations.filter(
                      (r) =>
                        r !== "claim" && r !== "influence" && r !== "vassal",
                    ),
                  },
                })
              }
            >
              查看{s.year}年图幅
            </button>
            <p className="empty-copy">
              主张、影响及臣属范围需在“筛选与图层”中另行开启。
            </p>
            {version?.reason && <p className="empty-copy">{version.reason}</p>}
          </article>
        );
      })}
      {!!plates.length && (
        <>
          <h2>来源参考图幅</h2>
          <p className="empty-copy">
            可放大查阅原图。262年、572年已编制行政参考切片；610年、742年待配准与年代核对。各图均不能直接证明实控疆界。
          </p>
          {plates.map((plate) => (
            <article className="territory-slice" key={plate.id}>
              <strong>
                {plate.year} 年 · {plate.title}
              </strong>
              <p className="empty-copy">{plate.limitations}</p>
              <button onClick={() => onOpenPlate?.(plate)}>
                查阅{plate.year}年参考图
              </button>
              <small>
                {plate.creator} · {plate.license}
              </small>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
