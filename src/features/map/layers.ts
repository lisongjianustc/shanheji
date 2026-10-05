import type { Scene } from "../../domain/types";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
export function buildTerritoryLayers(
  scene: Scene,
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: scene.territories.map((t) => ({
      ...t,
      properties: {
        ...t.properties,
        displayColor:
          scene.catalog.entities.find((e) => e.id === t.properties.entityId)
            ?.color ?? "#8a8b80",
        fillOpacity:
          t.properties.relation === "control"
            ? 0.3
            : t.properties.relation === "administration"
              ? 0.22
              : 0,
        approximate:
          t.properties.spatialPrecision !== "specified" ||
          scene.uncertainTerritoryIds.includes(t.properties.id),
      },
    })),
  };
}
