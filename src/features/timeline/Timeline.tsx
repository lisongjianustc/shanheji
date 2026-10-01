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
  onEntity?: (id: string) => void;
}
export const periods = [
  ["三国", 220],
  ["西晋", 280],
  ["东晋 · 十六国", 383],
  ["南北朝", 494],
  ["隋", 589],
  ["唐初", 618],
  ["盛唐", 713],
  ["唐末", 907],
] as const;
export function Timeline(p: TimelineProps) {
  const { state, catalog } = p;
  const [entry, setEntry] = useState(String(state.previewYear)),
    [error, setError] = useState(""),
    [speed, setSpeed] = useState(1),
    [autoPause, setAutoPause] = useState(true),
    [expanded, setExpanded] = useState(false);
  const current = useRef(p);
  current.current = p;
  const query = state.committed?.query ?? defaultQuery(),
    year = state.committed?.query.year ?? state.previewYear;
  useEffect(() => setEntry(String(state.previewYear)), [state.previewYear]);
  const go = (n: number) => {
    if (!Number.isInteger(n) || n < 220 || n > 907) {
      setError("请输入220至907之间的年份");
      return;
    }
    setError("");
    p.onRequest({ ...query, year: n, at: null });
  };
  useEffect(() => {
    if (!state.playing || state.status !== "ready") return;
    if (year >= 907) {
      p.onPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      const next = year + 1;
      const c = current.current;
      c.onRequest({ ...c.state.committed!.query, year: next, at: null });
      if (autoPause && c.eventYears?.includes(next)) c.onPlaying(false);
    }, 1000 / speed);
    return () => clearTimeout(timer);
  }, [state.playing, state.status, year, speed, autoPause]);
  const jump = (direction: -1 | 1) => {
    const years = [...new Set(p.eventYears ?? [])].sort((a, b) => a - b);
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
            onClick={() => go(year - 1)}
            disabled={year === 220}
          >
            ‹
          </button>
          <label className="year-entry">
            公元{" "}
            <input
              type="number"
              aria-label="年份"
              min="220"
              max="907"
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
            年
          </label>
          <button
            aria-label="后一年"
            onClick={() => go(year + 1)}
            disabled={year === 907}
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
          <button onClick={() => jump(-1)} title="上一个事件年份">
            上一事件
          </button>
          <button onClick={() => jump(1)} title="下一个事件年份">
            下一事件
          </button>
          <label>
            <input
              type="checkbox"
              checked={autoPause}
              onChange={(e) => setAutoPause(e.target.checked)}
            />
            事件处暂停
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
          {[220, 300, 400, 500, 600, 700, 800, 907].map((n) => (
            <span key={n} style={{ left: `${((n - 220) / 687) * 100}%` }}>
              {n}
            </span>
          ))}
        </div>
        <input
          className="time-slider"
          aria-label="拖动年份"
          type="range"
          min="220"
          max="907"
          value={state.previewYear}
          onChange={(e) => p.onPreview(Number(e.target.value))}
          onPointerUp={(e) => go(Number(e.currentTarget.value))}
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
              go(Number(e.currentTarget.value));
          }}
        />
        <div className="event-ticks">
          {[...new Set(p.eventYears ?? [])]
            .filter((n) => n >= 220 && n <= 907)
            .map((n) => (
              <button
                key={n}
                style={{ left: `${((n - 220) / 687) * 100}%` }}
                title={`${n}年有收录事件`}
                aria-label={`跳至${n}年事件`}
                onClick={() => go(n)}
              />
            ))}
        </div>
      </div>
      <nav className="period-nav" aria-label="时期导航">
        {periods.map(([label, n]) => (
          <button
            key={n}
            className={year === n ? "active" : ""}
            onClick={() => go(n)}
          >
            {label}
          </button>
        ))}
      </nav>
      {expanded && (
        <div className="parallel-bands">
          {bands.map((b) => (
            <div className="band-row" key={`${b.entityId}-${b.startYear}`}>
              <button
                className="band-name"
                onClick={() => p.onEntity?.(b.entityId)}
              >
                {b.label}
              </button>
              <div className="band-track">
                <button
                  aria-label={`${b.label} ${b.startYear}至${b.endYear}年`}
                  className="band"
                  style={{
                    left: `${((b.startYear - 220) / 688) * 100}%`,
                    width: `${((b.endYear - b.startYear + 1) / 688) * 100}%`,
                    background: catalog.entities.find(
                      (e) => e.id === b.entityId,
                    )?.color,
                  }}
                  title={`${b.startYear}—${b.endYear}年${b.uncertain ? "，确日不详" : ""}`}
                  onClick={() => go(b.startYear)}
                />
                <i
                  className="band-cursor"
                  style={{ left: `${((year - 220) / 688) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
