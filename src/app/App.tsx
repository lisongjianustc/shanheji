import { useEffect, useMemo, useRef, useState } from "react";
import { HistoryMap } from "../features/map/HistoryMap";
import { Timeline } from "../features/timeline/Timeline";
import { DetailPanel } from "../features/details/DetailPanel";
import {
  buildEventLocations,
  eventLabels,
  eventColors,
} from "../features/details/eventModel";
import { SearchPanel } from "../features/search/SearchPanel";
import { FilterPanel } from "../features/search/FilterPanel";
import { CoveragePanel } from "../features/coverage/CoveragePanel";
import { createRepository } from "../data/repository";
import type { Manifest } from "../data/manifest";
import { createHistoryController, type Selection } from "../state/controller";
import { useHistory } from "../state/useHistory";
import { defaultQuery } from "../domain/query";
import { classifyAt, nameAt, entityActiveInYear } from "../domain/time";
import type { Catalog, SearchEntry, Query } from "../domain/types";
const emptyCatalog: Catalog = { sources: [], entities: [], places: [] };
export default function App() {
  const repository = useMemo(() => createRepository(), []),
    controller = useMemo(
      () => createHistoryController(repository),
      [repository],
    ),
    state = useHistory(controller);
  const [catalog, setCatalog] = useState(emptyCatalog),
    [index, setIndex] = useState<SearchEntry[]>([]),
    [manifest, setManifest] = useState<Manifest | null>(null),
    [mapUnavailable, setMapUnavailable] = useState(""),
    [tab, setTab] = useState("events"),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [overviewError, setOverviewError] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null),
    lastRequest = useRef(defaultQuery());
  const loadOverview = (signal: AbortSignal) =>
    repository
      .overview(signal)
      .then((o) => {
        setCatalog(o.catalog);
        setIndex(o.index);
        setManifest(o.manifest);
        setOverviewError("");
      })
      .catch((e) => {
        if (!signal.aborted) setOverviewError(String(e));
      });
  useEffect(() => {
    const abort = new AbortController();
    void loadOverview(abort.signal);
    void controller.request(defaultQuery());
    return () => {
      abort.abort();
      controller.dispose();
    };
  }, [controller, repository]);
  useEffect(() => {
    if (mapUnavailable && state.pending)
      controller.acceptRendered(state.pending.requestId);
  }, [mapUnavailable, state.pending, controller]);
  useEffect(() => {
    if (!timelineRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      document.documentElement.style.setProperty(
        "--timeline-height",
        `${entry.target.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(timelineRef.current);
    return () => observer.disconnect();
  }, []);
  const scene = state.committed,
    query = scene?.query ?? defaultQuery();
  const request = (q: Query) => {
    lastRequest.current = q;
    void controller.request(q);
  };
  const select = (s: Selection) => {
    controller.select(s);
    setSidebarOpen(false);
    const e =
      s.kind === "event" ? scene?.events.find((e) => e.id === s.id) : undefined;
    if (
      scene &&
      e?.validity.precision === "day" &&
      e.validity.start.earliest === e.validity.start.latest &&
      scene.query.at !== e.validity.start.earliest &&
      scene.territories.some(
        (t) =>
          classifyAt(t.properties.validity, e.validity.start.earliest) ===
          "certain",
      )
    )
      request({ ...scene.query, at: e.validity.start.earliest });
  };
  const choose = (e: SearchEntry) => {
    select({ id: e.id, kind: e.kind });
    const year =
      query.year < e.startYear || query.year > e.endYear
        ? Math.max(220, Math.min(907, e.startYear))
        : query.year;
    request({
      ...query,
      year,
      at: null,
      filters: {
        ...query.filters,
        entityIds: [],
        eventKinds: [],
        regionIds: [],
      },
    });
  };
  const entities = catalog.entities.filter(
    (e) =>
      entityActiveInYear(e, query.year) &&
      (!query.filters.regionIds.length ||
        e.regionIds.some((r) => query.filters.regionIds.includes(r))) &&
      (!query.filters.entityIds.length ||
        query.filters.entityIds.includes(e.id)),
  );
  const eventYears = index
    .filter(
      (i) =>
        i.kind === "event" &&
        (!query.filters.entityIds.length ||
          i.entityIds?.some((id) => query.filters.entityIds.includes(id))) &&
        (!query.filters.eventKinds.length ||
          (i.eventKind && query.filters.eventKinds.includes(i.eventKind))) &&
        (!query.filters.regionIds.length ||
          i.regionIds.some((r) => query.filters.regionIds.includes(r))),
    )
    .map((i) => i.startYear);
  const locations = scene ? buildEventLocations(scene) : null;
  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-seal" aria-hidden="true">
            舆
          </span>
          <h1>山河纪</h1>
        </div>
        <span className="masthead-subtitle">
          三国至唐末的时间与疆域 <small>220—907</small>
        </span>
        <span className="header-year">
          公元 <b data-testid="committed-year">{scene?.query.year ?? "—"}</b> 年
        </span>
        <span className="status-tag" data-testid="scene-status">
          {state.status === "ready"
            ? "已更新"
            : state.status === "error"
              ? "资料加载失败"
              : "载入中"}
        </span>
      </header>
      <main className="workspace">
        <div className="map-region">
          <HistoryMap
            scene={scene}
            pending={state.pending}
            onRendered={controller.acceptRendered}
            onSelect={select}
            onUnavailable={setMapUnavailable}
            selected={state.selection}
          />
          <div className="map-caption">
            <span>山河之间 · 时间之中</span>
            <h2>看见同一时代</h2>
            <p>拖动时间，查阅政权与历史事件。</p>
          </div>
          {scene && (
            <div className="coverage-banner">
              {scene.warnings[0] ?? "显示已核验资料"}
              <span>
                {scene.referenceYears.length
                  ? `参考切片年份：${scene.referenceYears.join("、")} · `
                  : ""}
                底图为现代自然地理参考
              </span>
            </div>
          )}
        </div>
        <button
          className="mobile-browse"
          aria-expanded={sidebarOpen}
          onClick={() => {
            setSidebarOpen(!sidebarOpen);
            controller.select(null);
          }}
        >
          {sidebarOpen ? "关闭浏览" : "条目 · 搜索 · 图层"}
        </button>
        <aside
          className={`browse-panel ${sidebarOpen ? "mobile-open" : ""}`}
          aria-label="浏览历史资料"
        >
          <div className="browse-intro">
            <span className="eyebrow">历史地图 · 样板</span>
            <p>沿时间探索，循来源求证。</p>
          </div>
          <SearchPanel entries={index} year={query.year} onChoose={choose} />
          {overviewError && (
            <div className="empty-copy">
              检索目录加载失败。
              <button
                onClick={() => void loadOverview(new AbortController().signal)}
              >
                重试目录
              </button>
            </div>
          )}
          {scene && (
            <FilterPanel
              scene={scene}
              manifest={manifest}
              onRequest={request}
            />
          )}
          <nav className="browse-tabs" aria-label="浏览栏目">
            {[
              ["events", "本年事件"],
              ["entities", "并行政权"],
              ["coverage", "资料覆盖"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="browse-content">
            {tab === "events" && (
              <>
                <div className="section-heading">
                  <h2>{query.year} 年纪事</h2>
                  <span>{scene?.events.length ?? 0} 件</span>
                </div>
                <p className="empty-copy">
                  {locations?.features.features.length ?? 0} 个地图标记 ·{" "}
                  {locations?.unlocatedEventIds.length ?? 0} 件未定位
                </p>
                {scene?.events.map((e, i) => (
                  <button
                    className={`event-card ${state.selection?.id === e.id ? "active" : ""}`}
                    key={e.id}
                    onClick={() => select({ kind: "event", id: e.id })}
                  >
                    <span className="event-card-top">
                      <span style={{ color: eventColors[e.kind] }}>
                        ● {eventLabels[e.kind]}
                      </span>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </span>
                    <strong>{e.title}</strong>
                    <small>{e.validity.label}</small>
                    <p>{e.summary}</p>
                    <span className="card-action">查看记录与来源 ↗</span>
                  </button>
                ))}
                {!scene?.events.length && (
                  <div className="empty-state">
                    <span>卷</span>
                    <h3>本年暂无收录事件</h3>
                    <p>
                      可切换到下一个事件年份。
                      <br />
                      资料空白不代表历史空白。
                    </p>
                    <button
                      onClick={() => {
                        const year =
                          eventYears.find((y) => y > query.year) ??
                          eventYears[0];
                        if (year) request({ ...query, year, at: null });
                      }}
                      disabled={!eventYears.length}
                    >
                      寻找事件年份 →
                    </button>
                  </div>
                )}
              </>
            )}
            {tab === "entities" && (
              <>
                <div className="section-heading">
                  <h2>同一时代</h2>
                  <span>{entities.length} 个已收录</span>
                </div>
                <p className="empty-copy">
                  条带表示存续时间；有名录不等于已有疆域。
                </p>
                {entities.map((e) => (
                  <button
                    className="entity-card"
                    key={e.id}
                    onClick={() => select({ kind: "entity", id: e.id })}
                  >
                    <i style={{ background: e.color }} />
                    <span>
                      <strong>{nameAt(e.names, query.year)}</strong>
                      <small>{e.existence.label}</small>
                    </span>
                    <span>↗</span>
                  </button>
                ))}
                {!entities.length && (
                  <p className="empty-copy">当前年份／筛选下暂无收录政权。</p>
                )}
              </>
            )}
            {tab === "coverage" && scene && <CoveragePanel scene={scene} />}
          </div>
          <div className="browse-foot">
            阶段性内容 · 疆域资料仍在编制
            <br />
            <small>不将未知边界推算为历史事实</small>
          </div>
        </aside>
        {state.error && (
          <div className="load-error" role="alert">
            <h2>资料暂时无法加载</h2>
            <p>{state.error}</p>
            <button
              onClick={() => {
                void loadOverview(new AbortController().signal);
                request(lastRequest.current);
              }}
            >
              重新加载
            </button>
          </div>
        )}
        {scene && (
          <DetailPanel
            scene={scene}
            selection={state.selection}
            onSelect={select}
            onRequest={request}
            onClose={() => controller.select(null)}
          />
        )}
      </main>
      <div ref={timelineRef}>
        <Timeline
          state={state}
          catalog={catalog}
          onPreview={controller.preview}
          onRequest={request}
          onPlaying={controller.setPlaying}
          eventYears={eventYears.sort((a, b) => a - b)}
          onEntity={(id) => select({ kind: "entity", id })}
        />
      </div>
    </div>
  );
}
