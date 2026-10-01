import type { StyleSpecification } from "maplibre-gl";
export const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    land: {
      type: "geojson",
      data: "/basemap/land.geojson",
      attribution: "Natural Earth · 现代自然地理参考",
    },
    rivers: { type: "geojson", data: "/basemap/rivers.geojson" },
  },
  layers: [
    {
      id: "water",
      type: "background",
      paint: { "background-color": "#cddde0" },
    },
    {
      id: "land",
      source: "land",
      type: "fill",
      paint: { "fill-color": "#e8e6d7" },
    },
    {
      id: "coast",
      source: "land",
      type: "line",
      paint: { "line-color": "#a7b5ab", "line-width": 1 },
    },
    {
      id: "rivers",
      source: "rivers",
      type: "line",
      paint: {
        "line-color": "#a8c1c6",
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 6, 1.4],
      },
    },
  ],
};
