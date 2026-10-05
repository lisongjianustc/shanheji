import { yearOrdinal } from "../../domain/chronology";
import type { Catalog, HistoricalEvent, SearchEntry } from "../../domain/types";
import { yearOf, lastYear } from "../../domain/time";
export { lastYear } from "../../domain/time";
export function buildSearchIndex(
  catalog: Catalog,
  events: HistoricalEvent[],
): SearchEntry[] {
  const entities: SearchEntry[] = catalog.entities.map((e) => ({
    id: e.id,
    kind: "entity",
    label: e.names[0].text,
    aliases: e.names.map((n) => n.text),
    namePeriods: e.names
      .map((n) => ({
        text: n.text,
        startYear: Math.max(
          yearOf(e.existence.start.earliest),
          yearOf(n.validity.start.earliest),
        ),
        endYear: Math.min(lastYear(e.existence), lastYear(n.validity)),
      }))
      .filter((n) => n.startYear <= n.endYear),
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
  const distance = (e: { startYear: number; endYear: number }) =>
    year < e.startYear
      ? yearOrdinal(e.startYear) - yearOrdinal(year)
      : year > e.endYear
        ? yearOrdinal(year) - yearOrdinal(e.endYear)
        : 0;
  return entries
    .filter((e) =>
      [e.label, ...e.aliases].some((n) =>
        n.normalize("NFKC").toLocaleLowerCase().includes(value),
      ),
    )
    .map((e) => {
      const matched = e.namePeriods
        ?.filter((n) =>
          n.text.normalize("NFKC").toLocaleLowerCase().includes(value),
        )
        .sort((a, b) => distance(a) - distance(b))[0];
      return matched
        ? {
            ...e,
            label: matched.text,
            startYear: matched.startYear,
            endYear: matched.endYear,
          }
        : e;
    })
    .sort(
      (a, b) =>
        distance(a) - distance(b) || a.label.localeCompare(b.label, "zh"),
    );
}
