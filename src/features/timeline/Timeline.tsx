import {
  MIN_YEAR,
  MAX_YEAR,
  isSupportedYear,
  nextYear,
  previousYear,
  yearOrdinal,
  yearFromOrdinal,
  formatYear,
  formatYearRange,
  TIME_WINDOWS,
  windowForYear,
} from "../../domain/chronology";
import { useEffect, useRef, useState } from "react";
import type { Catalog, Query } from "../../domain/types";
import type { HistoryState } from "../../state/controller";
import { defaultQuery } from "../../domain/query";
import { buildBands } from "./bands";
export interface TimelineProps {
  state: HistoryState;
  catalog: Catalog;
  onPreview: (year: number) => void;
  onRequest: (q: Query) => void;
  onPlaying: (v: boolean) => void;
  eventYears?: number[];
  territoryYears?: number[];
  territoryMarkerYears?: number[];
  onEntity?: (id: string) => void;
}
export const periods = [
  ["夏（约）", -2100],
  ["商（约）", -1600],
  ["西周", -1046],
  ["春秋", -770],
  ["战国", -475],
  ["秦", -221],
  ["西汉", -206],
  ["新", 9],
  ["东汉", 25],
  ["三国", 220],
  ["西晋", 280],
  ["东晋 · 十六国", 383],
  ["南北朝", 494],
  ["隋", 589],
  ["唐初", 618],
  ["盛唐", 713],
  ["五代十国", 907],
  ["北宋 · 辽", 960],
  ["南宋 · 金", 1127],
  ["元", 1271],
  ["明", 1368],
  ["清", 1644],
  ["清末", 1912],
] as const;
export function Timeline(p: TimelineProps) {
  const { state, catalog } = p;
  const [entry, setEntry] = useState(String(state.previewYear)),
    [error, setError] = useState(""),
    [speed, setSpeed] = useState(1),
    [autoPause, setAutoPause] = useState(true),
    [expanded, setExpanded] = useState(false),
    [windowId, setWindowId] = useState<string>(
      windowForYear(state.previewYear).id,
    );
  const current = useRef(p);
  const selectedPeriodButton = useRef<HTMLButtonElement>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragYear = useRef<number | null>(null);
  current.current = p;
  const cancelDrag = () => {
    if (dragTimer.current !== null) clearTimeout(dragTimer.current);
    dragTimer.current = null;
    dragYear.current = null;
  };
  useEffect(() => cancelDrag, []);
  const query = state.committed?.query ?? defaultQuery(),
    year = state.committed?.query.year ?? state.previewYear;
  const activePeriod = periods.filter(([, n]) => n <= year).at(-1)?.[1];
  useEffect(() => {
    selectedPeriodButton.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
    });
  }, [activePeriod]);
  const selectedWindow =
    TIME_WINDOWS.find((w) => w.id === windowId) ?? TIME_WINDOWS[0];
  const visibleWindow =
    state.previewYear >= selectedWindow.start &&
    state.previewYear <= selectedWindow.end
      ? selectedWindow
      : windowForYear(state.previewYear);
  useEffect(() => {
    if (visibleWindow.id !== windowId) setWindowId(visibleWindow.id);
  }, [visibleWindow.id, windowId]);
  const start = visibleWindow.start,
    end = visibleWindow.end;
  const extent = yearOrdinal(end) - yearOrdinal(start);
  const position = (n: number) =>
    ((yearOrdinal(n) - yearOrdinal(start)) / extent) * 100;
  const ticks = Array.from({ length: 6 }, (_, i) =>
    yearFromOrdinal(Math.round(yearOrdinal(start) + (extent * i) / 5)),
  );
  useEffect(() => setEntry(String(state.previewYear)), [state.previewYear]);
  const go = (n: number) => {
    cancelDrag();
    if (!isSupportedYear(n)) {
      setError("请输入-2100至1912的年份；负数代表公元前，无0年");
      return;
    }
    setError("");
    p.onPlaying(false);
    p.onRequest({ ...query, year: n, at: null });
  };
  const drag = (n: number) => {
    p.onPlaying(false);
    p.onPreview(n);
    dragYear.current = n;
    if (dragTimer.current !== null) return;
    dragTimer.current = setTimeout(() => {
      dragTimer.current = null;
      const next = dragYear.current;
      dragYear.current = null;
      if (next === null) return;
      const c = current.current;
      c.onRequest({
        ...(c.state.committed?.query ?? defaultQuery()),
        year: next,
        at: null,
      });
    }, 100);
  };
  useEffect(() => {
    if (!state.playing || state.status !== "ready") return;
    if (year >= MAX_YEAR) {
      p.onPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      const next = nextYear(year);
      const c = current.current;
      c.onRequest({ ...c.state.committed!.query, year: next, at: null });
      if (
        autoPause &&
        (c.eventYears?.includes(next) || c.territoryYears?.includes(next))
      )
        c.onPlaying(false);
    }, 1000 / speed);
    return () => clearTimeout(timer);
  }, [state.playing, state.status, year, speed, autoPause]);
  const jump = (direction: -1 | 1) => {
    const years = [
      ...new Set([...(p.eventYears ?? []), ...(p.territoryYears ?? [])]),
    ].sort((a, b) => a - b);
    const target =
      direction > 0
        ? years.find((y) => y > year)
        : years.filter((y) => y < year).at(-1);
    if (target !== undefined) {
      p.onPlaying(false);
      go(target);
    }
  };
  const bands = buildBands(catalog.entities, query.filters);
  return (
    <section
      className={`timeline ${expanded ? "expanded" : ""}`}
      aria-label="历史时间轴"
    >
      <div className="timeline-controls">
        <div className="play-controls">
          <button
            className="play-button"
            aria-label={state.playing ? "暂停播放" : "播放时间轴"}
            onClick={() => p.onPlaying(!state.playing)}
            disabled={!state.committed || state.status === "error"}
          >
            {state.playing ? "Ⅱ" : "▶"}
          </button>
          <button
            aria-label="前一年"
            onClick={() => go(previousYear(year))}
            disabled={year === MIN_YEAR}
          >
            ‹
          </button>
          <label className="year-entry">
            年份{" "}
            <input
              type="number"
              aria-label="年份"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(entry.trim() ? Number(entry) : NaN);
              }}
              onBlur={() => {
                if (entry !== String(year))
                  go(entry.trim() ? Number(entry) : NaN);
              }}
            />{" "}
            <small title="例如：-221表示公元前221年；没有0年">
              负数为公元前
            </small>
          </label>
          <button
            aria-label="后一年"
            onClick={() => go(nextYear(year))}
            disabled={year === MAX_YEAR}
          >
            ›
          </button>
          <select
            aria-label="播放速度"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value="1">1 年 / 秒</option>
            <option value="2">2 年 / 秒</option>
            <option value="5">5 年 / 秒</option>
          </select>
        </div>
        <div className="timeline-options">
          <select
            aria-label="时间轴显示时段"
            value={visibleWindow.id}
            onChange={(e) => {
              const w = TIME_WINDOWS.find((w) => w.id === e.target.value)!;
              setWindowId(w.id);
              if (year < w.start || year > w.end) go(w.start);
            }}
          >
            {TIME_WINDOWS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          {!!p.territoryYears?.length && (
            <select
              aria-label="疆域资料年份"
              value=""
              onChange={(e) => go(Number(e.target.value))}
            >
              <option value="" disabled>
                选择疆域资料起止节点
              </option>
              {[...new Set(p.territoryYears)]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {formatYear(n)}
                  </option>
                ))}
            </select>
          )}
          <button onClick={() => jump(-1)} title="上一事件或疆域资料年份">
            上一节点
          </button>
          <button onClick={() => jump(1)} title="下一事件或疆域资料年份">
            下一节点
          </button>
          <label>
            <input
              type="checkbox"
              checked={autoPause}
              onChange={(e) => setAutoPause(e.target.checked)}
            />
            {p.territoryYears?.length ? "事件／疆域资料处暂停" : "事件处暂停"}
          </label>
          <button
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起政权带" : "展开政权带"}
          </button>
        </div>
      </div>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
      <div className="time-track">
        <div className="time-ticks">
          {ticks.map((n) => (
            <span key={n} style={{ left: `${position(n)}%` }}>
              {n < 0 ? `前${Math.abs(n)}` : n}
            </span>
          ))}
        </div>
        <input
          className="time-slider"
          aria-label="拖动年份"
          type="range"
          min={yearOrdinal(start)}
          max={yearOrdinal(end)}
          value={yearOrdinal(state.previewYear)}
          aria-valuetext={formatYear(state.previewYear)}
          onChange={(e) => drag(yearFromOrdinal(Number(e.target.value)))}
          onPointerUp={(e) =>
            go(yearFromOrdinal(Number(e.currentTarget.value)))
          }
          onKeyUp={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
                "PageUp",
                "PageDown",
              ].includes(e.key)
            )
              go(yearFromOrdinal(Number(e.currentTarget.value)));
          }}
        />
        <div className="event-ticks">
          {[...new Set(p.eventYears ?? [])]
            .filter((n) => n >= start && n <= end)
            .map((n) => (
              <button
                key={n}
                style={{ left: `${position(n)}%` }}
                title={`${formatYear(n)}有收录事件`}
                aria-label={`跳至${formatYear(n)}事件`}
                onClick={() => go(n)}
              />
            ))}
        </div>
        <div className="territory-ticks" aria-label="疆域资料节点">
          {[...new Set(p.territoryMarkerYears ?? p.territoryYears ?? [])]
            .filter((n) => n >= start && n <= end)
            .map((n) => (
              <button
                key={n}
                style={{ left: `${position(n)}%` }}
                title={`${formatYear(n)}有可叠加疆域资料`}
                aria-label={`跳至${formatYear(n)}疆域`}
                onClick={() => go(n)}
              >
                <i aria-hidden="true" />{" "}
                <span>{n < 0 ? `前${Math.abs(n)}` : n}</span>
              </button>
            ))}
        </div>
      </div>
      <nav className="period-nav" aria-label="时期导航">
        {periods.map(([label, n]) => (
          <button
            key={n}
            ref={n === activePeriod ? selectedPeriodButton : undefined}
            aria-current={n === activePeriod ? "date" : undefined}
            className={n === activePeriod ? "active" : ""}
            onClick={() => {
              setWindowId(windowForYear(n).id);
              go(n);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {expanded && (
        <div className="parallel-bands">
          {bands
            .filter((b) => b.startYear <= end && b.endYear >= start)
            .map((b) => (
              <div className="band-row" key={`${b.entityId}-${b.startYear}`}>
                <button
                  className="band-name"
                  onClick={() => p.onEntity?.(b.entityId)}
                >
                  {b.label}
                </button>
                <div className="band-track">
                  <button
                    aria-label={`${b.label} ${formatYearRange(b.startYear, b.endYear)}`}
                    className="band"
                    style={{
                      left: `${position(Math.max(start, b.startYear))}%`,
                      width: `${((yearOrdinal(Math.min(end, b.endYear)) - yearOrdinal(Math.max(start, b.startYear)) + 1) / (extent + 1)) * 100}%`,
                      background: catalog.entities.find(
                        (e) => e.id === b.entityId,
                      )?.color,
                    }}
                    title={`${formatYearRange(b.startYear, b.endYear)}${b.uncertain ? "，确日不详" : ""}`}
                    onClick={() => go(b.startYear)}
                  />
                  <i
                    className="band-cursor"
                    style={{ left: `${position(year)}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
