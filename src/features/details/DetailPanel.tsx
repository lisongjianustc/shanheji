import { useEffect, useRef } from "react";
import type {
  Scene,
  Query,
  Evidence,
  HistoricalEvent,
} from "../../domain/types";
import type { Selection } from "../../state/controller";
import { entityActiveAt, nameAt, yearOf, yearSpan } from "../../domain/time";
import { eventLabels, buildEventLocations } from "./eventModel";
export interface DetailProps {
  scene: Scene;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onRequest: (q: Query) => void;
  onClose: () => void;
}
export function DetailPanel(p: DetailProps) {
  const panel = useRef<HTMLElement>(null),
    close = useRef(p.onClose);
  close.current = p.onClose;
  const remembered = useRef(new Map<string, HistoricalEvent>());
  p.scene.events.forEach((e) => remembered.current.set(e.id, e));
  useEffect(() => {
    if (!p.selection) return;
    const origin = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (origin?.isConnected) origin.focus();
    };
  }, [p.selection?.id, p.selection?.kind]);
  if (!p.selection) return null;
  const { scene, selection } = p;
  const entity =
    selection.kind === "entity"
      ? scene.catalog.entities.find((e) => e.id === selection.id)
      : undefined;
  const event =
    selection.kind === "event"
      ? remembered.current.get(selection.id)
      : undefined;
  const place =
    selection.kind === "place"
      ? scene.catalog.places.find((e) => e.id === selection.id)
      : undefined;
  const title = entity
    ? nameAt(entity.names, scene.query.year)
    : (event?.title ??
      (place ? nameAt(place.names, scene.query.year) : "条目未载入"));
  const refs: Evidence[] =
    event?.evidence ??
    (entity
      ? [
          ...entity.names.flatMap((n) => n.evidence),
          ...entity.capitals.flatMap((c) => c.evidence),
          ...scene.territories
            .filter((t) => t.properties.entityId === entity.id)
            .flatMap((t) => t.properties.evidence),
        ]
      : place
        ? [
            ...place.names.flatMap((n) => n.evidence),
            ...place.locations.flatMap((l) => l.evidence),
          ]
        : []);
  const jump = (year: number) =>
    p.onRequest({
      ...scene.query,
      year: Math.max(220, Math.min(907, year)),
      at: null,
    });
  const territoryLabels = [
    ...new Set(Object.values(scene.territoryTimeLabels)),
  ];
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      className="detail-panel"
      aria-label="条目详情"
    >
      <div className="panel-heading">
        <span className="eyebrow">
          {entity
            ? "政权档案"
            : event
              ? "历史事件"
              : place
                ? "历史地点"
                : "详情"}
        </span>
        <button
          className="icon-button"
          aria-label="关闭详情"
          onClick={p.onClose}
        >
          ×
        </button>
      </div>
      <h2>{title}</h2>
      {event && (
        <>
          <p className="detail-date">{event.validity.label}</p>
          <div className="detail-tags">
            <span>{eventLabels[event.kind]}</span>
            <span>
              {scene.query.year === yearOf(event.validity.start.earliest)
                ? "始见于本年"
                : scene.query.year < yearOf(event.validity.endExclusive.latest)
                  ? "持续事件"
                  : "所选年份之外"}
            </span>
          </div>
          <p className="detail-summary">{event.summary}</p>
          {event.account && (
            <section>
              <h3>经过</h3>
              <p>{event.account}</p>
            </section>
          )}
          {event.interpretation && (
            <section>
              <h3>解释与限度</h3>
              <p>{event.interpretation}</p>
            </section>
          )}
          {!scene.events.some((e) => e.id === event.id) && (
            <p className="evidence-note">
              此事件不在当前年份或筛选结果中。
              <button
                onClick={() => jump(yearOf(event.validity.start.earliest))}
              >
                返回事件年份
              </button>
            </p>
          )}
          <section>
            <h3>发生地点</h3>
            {event.placeIds.length ? (
              event.placeIds.map((id) => {
                const item = scene.catalog.places.find((x) => x.id === id);
                const loc = buildEventLocations({
                  ...scene,
                  events: [event],
                }).features.features.filter((f) => f.properties.placeId === id);
                return (
                  <p key={id}>
                    <button
                      className="text-button"
                      onClick={() => p.onSelect({ kind: "place", id })}
                    >
                      {item
                        ? nameAt(
                            item.names,
                            yearOf(event.validity.start.earliest),
                          )
                        : "地点待核"}
                    </button>
                    <small>
                      {" "}
                      ·{" "}
                      {loc.length
                        ? loc.some((l) => l.properties.approximate)
                          ? "近似位置"
                          : "资料所标位置"
                        : "未标点／区域范围"}
                    </small>
                  </p>
                );
              })
            ) : (
              <p>发生地点或坐标待核，仅收录文字。</p>
            )}
          </section>
          <p className="evidence-note">
            {event.validity.precision === "day"
              ? "当前疆域参考时点与事件时点可能不同，请核对下方切片日期。"
              : "仅年或范围精度，未推定具体发生日。"}
            <br />
            {territoryLabels.length
              ? `疆域切片：${territoryLabels.join("；")}`
              : "当前年份暂无已核验疆域。"}
          </p>
          {event.entityIds.length > 0 && (
            <section>
              <h3>关联政权</h3>
              <div className="related-items">
                {event.entityIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => p.onSelect({ kind: "entity", id })}
                  >
                    {nameAt(
                      scene.catalog.entities.find((e) => e.id === id)?.names ??
                        [],
                      scene.query.year,
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {entity && (
        <>
          <p className="detail-date">{entity.existence.label}</p>
          {entity.activePeriods && (
            <p>
              存续分段：{entity.activePeriods.map((v) => v.label).join("；")}
            </p>
          )}
          <p>
            {
              {
                polity: "政权",
                "local-power": "地方势力",
                confederation: "联盟",
                administration: "行政机构",
              }[entity.kind]
            }
          </p>
          {!entityActiveAt(entity, scene.referenceAt) && (
            <p className="evidence-note">
              在当前参考时点之外。
              <button
                onClick={() => jump(yearOf(entity.existence.start.earliest))}
              >
                跳至存续期
              </button>
            </p>
          )}
          <section>
            <h3>都城记录</h3>
            {entity.capitals.length ? (
              entity.capitals.map((c, i) => (
                <p key={i}>
                  <button
                    className="text-button"
                    onClick={() => p.onSelect({ kind: "place", id: c.placeId })}
                  >
                    {nameAt(
                      scene.catalog.places.find((x) => x.id === c.placeId)
                        ?.names ?? [],
                      scene.query.year,
                    )}
                  </button>
                  <small> · {c.validity.label}</small>
                </p>
              ))
            ) : (
              <p>尚无已收录的都城资料。</p>
            )}
          </section>
          <section>
            <h3>本年疆域依据</h3>
            {scene.territories
              .filter((t) => t.properties.entityId === entity.id)
              .map((t) => (
                <p key={t.properties.id}>
                  {t.properties.validity.label} ·{" "}
                  {t.properties.compilation.errorNote}
                </p>
              ))}
            {!scene.territories.some(
              (t) => t.properties.entityId === entity.id,
            ) && <p>未收录本年可靠疆域，不能据此判断其实际范围。</p>}
          </section>
          <p className="evidence-note">
            前后疆域变化需要相邻已核验切片；当前资料不足时不推算。
          </p>
        </>
      )}
      {place && (
        <>
          <p className="detail-summary">
            {place.names.map((n) => n.text).join(" / ")}
          </p>
          {place.locations.length ? (
            place.locations.map((l, i) => (
              <p key={i}>
                {yearSpan(l.validity)} ·{" "}
                {l.geometry.type === "Point" ? "点位" : "区域"} ·{" "}
                {l.spatialPrecision === "approximate"
                  ? "近似位置"
                  : "资料所标位置"}
              </p>
            ))
          ) : (
            <p>暂缺可发布的历史位置。</p>
          )}
        </>
      )}
      <section className="source-section">
        <h3>资料与核验</h3>
        {[
          ...new Map(
            refs.map((r) => [`${r.sourceId}:${r.locator}`, r]),
          ).values(),
        ].map((r, i) => {
          const s = scene.catalog.sources.find((x) => x.id === r.sourceId);
          return (
            <div className="source-item" key={i}>
              {s?.url && /^https?:\/\//i.test(s.url) ? (
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title} ↗
                </a>
              ) : (
                <span>{s?.title ?? "来源待核"}</span>
              )}
              <small>{r.locator}</small>
              {r.note && <p>{r.note}</p>}
            </div>
          );
        })}
        {event && (
          <small>
            核验：
            {event.review.reviewerKind === "agent"
              ? "程序辅助资料核对，未经历史专家审定"
              : "人工核验"}{" "}
            · {event.review.checkedAt}
          </small>
        )}
      </section>
    </aside>
  );
}
