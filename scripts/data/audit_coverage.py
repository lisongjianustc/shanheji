"""Inventory available annual geometry; this does not certify historic accuracy."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads(path.read_text())


def year(day):
    return int(day.rsplit("-", 2)[0])


def years(validity):
    start = year(validity["start"]["earliest"])
    end_day = validity["endExclusive"]["latest"]
    end = year(end_day)
    if end_day.endswith("-01-01"):
        end = -1 if end == 1 else end - 1
    return set(range(max(-2100, start), min(1912, end) + 1)) - {0}


def spans(values):
    out = []
    for value in sorted(values):
        if out and (value == out[-1][1] + 1 or (value == 1 and out[-1][1] == -1)):
            out[-1][1] = value
        else:
            out.append([value, value])
    return out


def fmt(ranges):
    def y(n):
        return f"前{abs(n)}" if n < 0 else str(n)
    return "、".join(y(a) if a == b else f"{y(a)}—{y(b)}" for a, b in ranges) or "无"


def main(checked_at="2026-10-05"):
    catalog = read(ROOT / "data/catalog/entities.json")
    packs = [read(p) for p in sorted((ROOT / "data/packages").glob("*/package.json"))]
    features = {f["properties"]["id"]: f for p in packs for f in p["territories"]}
    events = {e["id"]: e for p in packs for e in p["events"]}
    records = []
    for entity in catalog:
        active = set().union(*(years(v) for v in entity.get("activePeriods", [entity["existence"]])))
        fs = [f for f in features.values() if f["properties"]["entityId"] == entity["id"] and
              f["properties"]["review"]["status"] == "verified" and
              f["properties"]["relation"] in ("control", "administration", "reconstruction")]
        available = set().union(*(
            {f["properties"]["snapshotYear"]} if f["properties"]["temporalSupport"] == "snapshot"
            else years(f["properties"]["validity"]) for f in fs))
        nonpartial = set().union(*(
            {f["properties"]["snapshotYear"]} if f["properties"]["temporalSupport"] == "snapshot"
            else years(f["properties"]["validity"]) for f in fs
            if f["properties"]["compilation"].get("extent") != "partial-source"))
        partial_only = available - nonpartial
        # The first active name is the displayed identity; overlapping aliases
        # do not represent additional historical phases.
        phase_years = {}
        for value in sorted(active):
            name = next((n for n in entity["names"] if value in years(n["validity"])), entity["names"][0])
            phase_years.setdefault(name["text"], set()).add(value)
        for name, scope in phase_years.items():
            if not scope:
                continue
            records.append({"entityId": entity["id"], "name": name,
                            "registeredYears": spans(scope), "availableYears": spans(scope & available),
                            "missingYears": spans(scope - available), "partialOnlyYears": spans(scope & partial_only), "geometryRecords": len(fs)})
    result = {"checkedAt": checked_at, "meaning": "年度资料存在性清单；有记录不表示范围完整或历史事实已审定；仅统计已登记政权与所有已核验来源。页面按筛选和默认来源的实际查询结果另见annual-query-sweep.md。",
              "packages": len(packs), "entities": len(catalog), "uniqueTerritories": len(features),
              "territoryReferences": sum(len(p["territories"]) for p in packs),
              "uniqueEvents": len(events), "eventReferences": sum(len(p["events"]) for p in packs),
              "records": records}
    (ROOT / "data/audits/annual-availability.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    lines = ["# 登记政权的年度疆域资料可用性", "", result["meaning"], "",
             "起点可能是目录展示范围，不代表建国年份。研究区间以来源两端包含口径统计；确日查询另行排除年度数据。", "",
             "| 名称阶段 | 已登记年份 | 有任一范围资料的年份 | 其中仅部分图幅的年份 | 尚无范围资料的年份 |",
             "| --- | --- | --- | --- | --- |"]
    lines += [f"| {r['name']} | {fmt(r['registeredYears'])} | {fmt(r['availableYears'])} | {fmt(r['partialOnlyYears'])} | {fmt(r['missingYears'])} |" for r in records]
    (ROOT / "docs/data/annual-availability.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "records"}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checked-at", default="2026-10-05")
    main(parser.parse_args().checked_at)
