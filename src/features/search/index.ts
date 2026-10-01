import type {
  Catalog,
  HistoricalEvent,
  SearchEntry,
  Validity,
} from "../../domain/types";
import { yearOf } from "../../domain/time";
export const lastYear = (v: Validity) =>
  yearOf(v.endExclusive.latest) -
  (v.endExclusive.latest.endsWith("-01-01") ? 1 : 0);
export function buildSearchIndex(
  catalog: Catalog,
  events: HistoricalEvent[],
): SearchEntry[] {
  const entities: SearchEntry[] = catalog.entities.map((e) => ({
    id: e.id,
    kind: "entity",
    label: e.names[0].text,
    aliases: e.names.map((n) => n.text),
    startYear: yearOf(e.existence.start.earliest),
    endYear: lastYear(e.existence),
    regionIds: e.regionIds,
  }));
  const places: SearchEntry[] = catalog.places.map((p) => ({
    id: p.id,
    kind: "place",
    label: p.names[0].text,
    aliases: p.names.map((n) => n.text),
    startYear: Math.min(
      ...p.names.map((n) => yearOf(n.validity.start.earliest)),
    ),
    endYear: Math.max(...p.names.map((n) => lastYear(n.validity))),
    regionIds: [],
  }));
  const items: SearchEntry[] = [
    ...new Map(events.map((e) => [e.id, e])).values(),
  ].map((e) => ({
    id: e.id,
    kind: "event",
    entityIds: e.entityIds,
    eventKind: e.kind,
    label: e.title,
    aliases: [],
    startYear: yearOf(e.validity.start.earliest),
    endYear: lastYear(e.validity),
    regionIds: [
      ...new Set(
        e.entityIds.flatMap(
          (id) => catalog.entities.find((c) => c.id === id)?.regionIds ?? [],
        ),
      ),
    ],
  }));
  return [...entities, ...places, ...items];
}
export function searchEntries(
  entries: SearchEntry[],
  text: string,
  year: number,
): SearchEntry[] {
  const value = text.trim().normalize("NFKC").toLocaleLowerCase();
  if (!value) return [];
  const distance = (e: SearchEntry) =>
    year < e.startYear
      ? e.startYear - year
      : year > e.endYear
        ? year - e.endYear
        : 0;
  return entries
    .filter((e) =>
      [e.label, ...e.aliases].some((n) =>
        n.normalize("NFKC").toLocaleLowerCase().includes(value),
      ),
    )
    .sort(
      (a, b) =>
        distance(a) - distance(b) || a.label.localeCompare(b.label, "zh"),
    );
}
