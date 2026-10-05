import type { Scene } from "../../domain/types";
import type { MultiPolygon, Polygon, Position } from "geojson";
import { buildEventLocations } from "../details/eventModel";

export function sceneBounds(scene: Scene | null) {
  if (!scene) return null;
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  const include = ([x, y]: Position) => {
    west = Math.min(west, x);
    east = Math.max(east, x);
    south = Math.min(south, y);
    north = Math.max(north, y);
  };
  const includeArea = (geometry: Polygon | MultiPolygon) => {
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    for (const polygon of polygons)
      for (const point of polygon[0]) include(point);
  };
  for (const t of scene.territories) includeArea(t.geometry);
  const locations = buildEventLocations(scene);
  for (const f of locations.features.features) include(f.geometry.coordinates);
  for (const f of locations.areaFeatures.features) includeArea(f.geometry);
  return Number.isFinite(west)
    ? ([
        [west, south],
        [east, north],
      ] as [[number, number], [number, number]])
    : null;
}
