import { useState } from "react";
import type { SearchEntry } from "../../domain/types";
import { searchEntries } from "./index";
export function SearchPanel(p: {
  entries: SearchEntry[];
  year: number;
  onChoose: (item: SearchEntry) => void;
}) {
  const [text, setText] = useState("");
  const results = searchEntries(p.entries, text, p.year);
  return (
    <section className="search-panel" aria-label="历史条目搜索">
      <div className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="搜索政权、地点或事件"
          type="search"
          placeholder="搜索政权、地点、事件"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {text.trim() && (
        <div className="search-results">
          <small>找到 {results.length} 项 · 全时段检索</small>
          {results.map((e) => (
            <button key={`${e.kind}:${e.id}`} onClick={() => p.onChoose(e)}>
              <strong>{e.label}</strong>
              <span>
                {{ entity: "政权", place: "地点", event: "事件" }[e.kind]} ·{" "}
                {e.startYear}—{e.endYear}年
                {e.regionIds.length ? ` · ${e.regionIds.join(" / ")}` : ""}
              </span>
              {(p.year < e.startYear || p.year > e.endYear) && (
                <em>跳至{Math.max(220, Math.min(907, e.startYear))}年 ↗</em>
              )}
            </button>
          ))}
          {!results.length && <p className="empty-copy">尚未收录匹配条目。</p>}
        </div>
      )}
    </section>
  );
}
