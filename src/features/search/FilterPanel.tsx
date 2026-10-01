import type {
  Scene,
  Query,
  Filters,
  EventKind,
  Relation,
} from "../../domain/types";
import type { Manifest } from "../../data/manifest";
import { DEFAULT_FILTERS } from "../../domain/query";
import { nameAt } from "../../domain/time";
import { eventLabels } from "../details/eventModel";
import { regionLabels, relationLabels } from "../coverage/CoveragePanel";
export function FilterPanel({
  scene,
  manifest,
  onRequest,
}: {
  scene: Scene;
  manifest: Manifest | null;
  onRequest: (q: Query) => void;
}) {
  const f = scene.query.filters;
  const change = (patch: Partial<Filters>) =>
    onRequest({ ...scene.query, filters: { ...f, ...patch } });
  const count =
    f.regionIds.length +
    f.entityIds.length +
    f.eventKinds.length +
    (f.relations.length === 1 && f.relations[0] === "control" ? 0 : 1) +
    Number(f.nearbyReference) +
    f.interpretationIds.length;
  return (
    <details className="filter-panel">
      <summary>
        筛选与图层{" "}
        <span>{count ? "已启用 " + count + " 项" : "默认：实际控制"}</span>
      </summary>
      <label>
        地区
        <select
          aria-label="地区"
          value={f.regionIds[0] ?? ""}
          onChange={(e) =>
            change({ regionIds: e.target.value ? [e.target.value] : [] })
          }
        >
          <option value="">全部地区</option>
          {Object.entries(regionLabels).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        政权
        <select
          aria-label="政权筛选"
          value={f.entityIds[0] ?? ""}
          onChange={(e) =>
            change({ entityIds: e.target.value ? [e.target.value] : [] })
          }
        >
          <option value="">全部政权</option>
          {scene.catalog.entities.map((e) => (
            <option key={e.id} value={e.id}>
              {nameAt(e.names, scene.query.year)} · {e.existence.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        事件类型
        <select
          aria-label="事件类型"
          value={f.eventKinds[0] ?? ""}
          onChange={(e) =>
            change({
              eventKinds: e.target.value ? [e.target.value as EventKind] : [],
            })
          }
        >
          <option value="">全部事件</option>
          {Object.entries(eventLabels).map(([id, name]) => (
            <option value={id} key={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>疆域关系</legend>
        {Object.entries(relationLabels).map(([id, label]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={f.relations.includes(id as Relation)}
              onChange={(e) =>
                change({
                  relations: e.target.checked
                    ? [...f.relations, id as Relation]
                    : f.relations.filter((r) => r !== id),
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={f.nearbyReference}
          onChange={(e) => change({ nearbyReference: e.target.checked })}
        />
        允许显示近年参考切片
      </label>
      {!!manifest?.interpretations.length && (
        <label>
          史料解释版本
          <select
            aria-label="史料解释版本"
            value={f.interpretationIds[0] ?? ""}
            onChange={(e) =>
              change({
                interpretationIds: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">全部已发布版本</option>
            {manifest.interpretations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
          {manifest.interpretations
            .filter(
              (i) =>
                !f.interpretationIds.length ||
                f.interpretationIds.includes(i.id),
            )
            .map((i) => (
              <small key={i.id}>
                {i.label}：{i.reason}
              </small>
            ))}
        </label>
      )}
      <button
        className="clear-filters"
        onClick={() => change({ ...DEFAULT_FILTERS })}
      >
        清除筛选
      </button>
    </details>
  );
}
