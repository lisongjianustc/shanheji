import type { Scene } from "../../domain/types";
import type {
  FeatureCollection,
  Polygon,
  MultiPolygon,
  MultiLineString,
} from "geojson";
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
            : ["administration", "reconstruction"].includes(
                  t.properties.relation,
                )
              ? 0.22
              : 0,
        approximate:
          t.properties.spatialPrecision !== "specified" ||
          scene.uncertainTerritoryIds.includes(t.properties.id),
      },
    })),
  };
}

// Fill extents may be cropped by the source; the border must not close those gaps.
export function buildTerritoryBorders(
  scene: Scene,
): FeatureCollection<MultiLineString> {
  return {
    type: "FeatureCollection",
    features: buildTerritoryLayers(scene).features.map((t) => ({
      type: "Feature",
      properties: t.properties,
      geometry: scene.territories.find(
        (s) => s.properties.id === t.properties?.id,
      )!.properties.compilation.boundaryGeometry ?? {
        type: "MultiLineString",
        coordinates:
          t.geometry.type === "Polygon"
            ? t.geometry.coordinates
            : t.geometry.coordinates.flat(),
      },
    })),
  };
}
