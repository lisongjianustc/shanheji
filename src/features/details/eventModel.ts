import { nextYear } from "../../domain/chronology";
import type { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import type { Scene, EventKind } from "../../domain/types";
import { yearDay, compareDays } from "../../domain/time";
export const eventLabels: Record<EventKind, string> = {
  military: "战争",
  political: "政权",
  diplomatic: "交往",
  migration: "迁徙",
  culture: "文化",
  disaster: "灾异",
};
export const eventColors: Record<EventKind, string> = {
  military: "#a35e4c",
  political: "#a4833d",
  diplomatic: "#427c87",
  migration: "#8b759a",
  culture: "#55876b",
  disaster: "#747b86",
};
export function buildEventLocations(scene: Scene) {
  const features: FeatureCollection<
    Point,
    { eventId: string; placeId: string; kind: EventKind; approximate: boolean }
  > = { type: "FeatureCollection", features: [] };
  const areaFeatures: FeatureCollection<
    Polygon | MultiPolygon,
    { eventId: string; placeId: string }
  > = { type: "FeatureCollection", features: [] };
  const unlocatedEventIds: string[] = [];
  for (const event of new Map(scene.events.map((e) => [e.id, e])).values()) {
    let located = false;
    const start = [event.validity.start.earliest, yearDay(scene.query.year)]
      .sort(compareDays)
      .at(-1)!;
    const end = [
      event.validity.endExclusive.latest,
      yearDay(nextYear(scene.query.year)),
    ].sort(compareDays)[0];
    for (const id of new Set(event.placeIds)) {
      const place = scene.catalog.places.find((p) => p.id === id);
      for (const location of place?.locations ?? []) {
        if (
          compareDays(start, end) >= 0 ||
          compareDays(location.validity.start.earliest, end) >= 0 ||
          compareDays(location.validity.endExclusive.latest, start) <= 0
        )
          continue;
        located = true;
        if (location.geometry.type === "Point")
          features.features.push({
            type: "Feature",
            geometry: location.geometry,
            properties: {
              eventId: event.id,
              placeId: id,
              kind: event.kind,
              approximate: location.spatialPrecision === "approximate",
            },
          });
        else
          areaFeatures.features.push({
            type: "Feature",
            geometry: location.geometry,
            properties: { eventId: event.id, placeId: id },
          });
      }
    }
    if (!located) unlocatedEventIds.push(event.id);
  }
  return { features, areaFeatures, unlocatedEventIds };
}
