import { useEffect, useRef, useState } from "react";
import type { Map as MapInstance, Marker, GeoJSONSource } from "maplibre-gl";
import type { Scene } from "../../domain/types";
import type { Selection } from "../../state/controller";
import { mapStyle } from "./style";
import { buildTerritoryLayers } from "./layers";
import { nameAt, classifyAt, entityActiveAt } from "../../domain/time";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  buildEventLocations,
  eventColors,
  eventLabels,
} from "../details/eventModel";
export interface MapProps {
  scene: Scene | null;
  pending: { requestId: number; scene: Scene } | null;
  onRendered: (id: number) => void;
  onSelect: (value: Selection) => void;
  onUnavailable: (reason: string) => void;
  selected?: Selection | null;
}
const empty = { type: "FeatureCollection" as const, features: [] };
function fitTerritories(map: MapInstance, scene: Scene | null) {
  if (!scene?.territories.length) return false;
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  for (const t of scene.territories) {
    const polygons =
      t.geometry.type === "Polygon"
        ? [t.geometry.coordinates]
        : t.geometry.coordinates;
    for (const polygon of polygons)
      for (const [x, y] of polygon[0]) {
        west = Math.min(west, x);
        east = Math.max(east, x);
        south = Math.min(south, y);
        north = Math.max(north, y);
      }
  }
  if (!Number.isFinite(west)) return false;
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 50, maxZoom: 5, duration: 0 },
  );
  return true;
}
export function HistoryMap(props: MapProps) {
  const host = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapInstance | null>(null),
    latest = useRef(props);
  latest.current = props;
  const markers = useRef<Marker[]>([]);
  const framedTerritories = useRef("");
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [basemapError, setBasemapError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const fail = (reason: string) => {
      if (cancelled) return;
      setError(reason);
      latest.current.onUnavailable(reason);
    };
    if (typeof window.WebGLRenderingContext === "undefined") {
      fail("当前环境不支持 WebGL");
      return;
    }
    import("maplibre-gl")
      .then((lib) => {
        if (cancelled || !host.current) return;
        try {
          lib.setWorkerUrl(workerUrl);
          const map = new lib.Map({
            container: host.current,
            style: mapStyle,
            center: [108, 35],
            zoom: 3.35,
            minZoom: 1.6,
            maxZoom: 8,
            attributionControl: { compact: true },
          });
          mapRef.current = map;
          loadTimer = setTimeout(() => fail("地图初始化超时"), 15000);
          map.addControl(
            new lib.NavigationControl({ showCompass: false }),
            "top-right",
          );
          map.addControl(
            new lib.ScaleControl({ unit: "metric" }),
            "bottom-left",
          );
          map.on("error", (e) => {
            if (
              "sourceId" in e &&
              (e.sourceId === "land" || e.sourceId === "rivers")
            )
              setBasemapError(true);
          });
          map.on("load", () => {
            if (cancelled) return;
            clearTimeout(loadTimer);
            map.addSource("event-areas", { type: "geojson", data: empty });
            map.addLayer({
              id: "event-areas-fill",
              source: "event-areas",
              type: "fill",
              paint: { "fill-color": "#b58c48", "fill-opacity": 0.14 },
            });
            map.addLayer({
              id: "event-areas-line",
              source: "event-areas",
              type: "line",
              paint: {
                "line-color": "#9d7940",
                "line-dasharray": [2, 3],
                "line-width": 2,
              },
            });
            map.on("click", "event-areas-fill", (e) => {
              const id = e.features?.[0]?.properties?.eventId;
              if (id) latest.current.onSelect({ kind: "event", id });
            });
            map.addSource("territories", { type: "geojson", data: empty });
            map.addLayer({
              id: "territory-fill",
              source: "territories",
              type: "fill",
              paint: {
                "fill-color": ["get", "displayColor"],
                "fill-opacity": ["get", "fillOpacity"],
              },
            });
            map.addLayer({
              id: "territory-border",
              source: "territories",
              type: "line",
              filter: [
                "all",
                ["==", ["get", "approximate"], false],
                [
                  "in",
                  ["get", "relation"],
                  ["literal", ["control", "administration"]],
                ],
              ],
              paint: {
                "line-color": ["get", "displayColor"],
                "line-width": 1.5,
              },
            });
            map.addLayer({
              id: "territory-uncertain",
              source: "territories",
              type: "line",
              filter: [
                "all",
                ["==", ["get", "approximate"], true],
                [
                  "in",
                  ["get", "relation"],
                  ["literal", ["control", "administration"]],
                ],
              ],
              paint: {
                "line-color": ["get", "displayColor"],
                "line-width": 1.5,
                "line-dasharray": [3, 2],
              },
            });
            for (const [relation, dash] of [
              ["vassal", [6, 3]],
              ["influence", [1, 3]],
              ["claim", [6, 2, 1, 2]],
            ] as const) {
              map.addLayer({
                id: `territory-${relation}`,
                source: "territories",
                type: "line",
                filter: ["==", ["get", "relation"], relation],
                paint: {
                  "line-color": ["get", "displayColor"],
                  "line-width": 2.5,
                  "line-dasharray": [...dash],
                },
              });
            }
            map.on("click", "territory-fill", (e) => {
              const id = e.features?.[0]?.properties?.entityId;
              if (id) latest.current.onSelect({ kind: "entity", id });
            });
            map.on("mouseenter", "territory-fill", () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "territory-fill", () => {
              map.getCanvas().style.cursor = "";
            });
            setReady(true);
          });
          observer = new ResizeObserver(() => {
            map.resize();
            fitTerritories(
              map,
              latest.current.pending?.scene ?? latest.current.scene,
            );
          });
          observer.observe(host.current);
        } catch (e) {
          fail(e instanceof Error ? e.message : "无法创建地图");
        }
      })
      .catch((e) => fail(String(e)));
    return () => {
      cancelled = true;
      clearTimeout(loadTimer);
      observer?.disconnect();
      markers.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    const scene = props.pending?.scene ?? props.scene;
    if (!ready || !map || !scene || error) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let redraw: (() => void) | undefined;
    let popup: import("maplibre-gl").Popup | undefined;
    (map.getSource("territories") as GeoJSONSource).setData(
      buildTerritoryLayers(scene),
    );
    const frameKey = scene.territories
      .map((t) => t.properties.id)
      .sort()
      .join("/");
    if (frameKey && frameKey !== framedTerritories.current) {
      fitTerritories(map, scene);
    }
    framedTerritories.current = frameKey;
    const locations = buildEventLocations(scene);
    (map.getSource("event-areas") as GeoJSONSource).setData(
      locations.areaFeatures,
    );
    const applyMarkers = async () => {
      const lib = await import("maplibre-gl");
      if (stopped) return;
      redraw = () => {
        popup?.remove();
        markers.current.forEach((m) => m.remove());
        markers.current = [];
        for (const entity of scene.catalog.entities.filter((e) =>
          entityActiveAt(e, scene.referenceAt),
        )) {
          if (
            (scene.query.filters.entityIds.length &&
              !scene.query.filters.entityIds.includes(entity.id)) ||
            (scene.query.filters.regionIds.length &&
              !entity.regionIds.some((r) =>
                scene.query.filters.regionIds.includes(r),
              ))
          )
            continue;
          const capital = entity.capitals.find(
            (p) => classifyAt(p.validity, scene.referenceAt) !== "outside",
          );
          const place = scene.catalog.places.find(
            (p) => p.id === capital?.placeId,
          );
          const location = place?.locations.find(
            (l) =>
              l.geometry.type === "Point" &&
              classifyAt(l.validity, scene.referenceAt) !== "outside",
          );
          if (location?.geometry.type === "Point") {
            const el = document.createElement("button");
            el.className = "capital-label";
            el.textContent = `◇ ${nameAt(place!.names, scene.query.year)}`;
            el.title = `${nameAt(entity.names, scene.query.year)}都城（近似位置）`;
            el.onclick = () =>
              latest.current.onSelect({ kind: "entity", id: entity.id });
            markers.current.push(
              new lib.Marker({ element: el })
                .setLngLat(location.geometry.coordinates as [number, number])
                .addTo(map),
            );
          }
        }
        const groups: {
          point: [number, number];
          x: number;
          y: number;
          items: typeof locations.features.features;
        }[] = [];
        for (const f of locations.features.features) {
          const point = f.geometry.coordinates as [number, number],
            pixel = map.project(point);
          const near = groups.find(
            (g) => Math.hypot(g.x - pixel.x, g.y - pixel.y) < 32,
          );
          if (near) near.items.push(f);
          else groups.push({ point, x: pixel.x, y: pixel.y, items: [f] });
        }
        for (const group of groups) {
          const unique = [
            ...new Set(group.items.map((f) => f.properties.eventId)),
          ];
          const el = document.createElement("button");
          el.className =
            "event-glow" +
            (unique.includes(latest.current.selected?.id ?? "")
              ? " selected"
              : "");
          el.style.setProperty(
            "--event-color",
            eventColors[group.items[0].properties.kind],
          );
          el.textContent = unique.length > 1 ? String(unique.length) : "•";
          const label = unique
            .map((id) => scene.events.find((e) => e.id === id)?.title)
            .join("、");
          el.setAttribute("aria-label", label);
          el.title = label;
          el.onclick = () => {
            if (unique.length === 1)
              latest.current.onSelect({ kind: "event", id: unique[0] });
            else {
              const list = document.createElement("div");
              list.className = "cluster-list";
              const heading = document.createElement("strong");
              heading.textContent = `附近 ${unique.length} 件事件`;
              list.append(heading);
              for (const id of unique) {
                const e = scene.events.find((e) => e.id === id)!;
                const button = document.createElement("button");
                button.textContent = `${eventLabels[e.kind]} · ${e.title}`;
                button.onclick = () => {
                  latest.current.onSelect({ kind: "event", id });
                  popup?.remove();
                };
                list.append(button);
              }
              popup = new lib.Popup({ closeButton: true })
                .setLngLat(group.point)
                .setDOMContent(list)
                .addTo(map);
              list.querySelector("button")?.focus();
            }
          };
          markers.current.push(
            new lib.Marker({ element: el }).setLngLat(group.point).addTo(map),
          );
        }
      };
      redraw();
      map.on("moveend", redraw);
      if (props.pending) {
        const id = props.pending.requestId;
        const ack = () => {
          if (!stopped) latest.current.onRendered(id);
        };
        map.once("idle", ack);
        map.triggerRepaint();
        timer = setTimeout(() => {
          if (!stopped) {
            setError("地图更新超时");
            latest.current.onUnavailable("地图更新超时，文字浏览仍可使用");
          }
        }, 12000);
      }
    };
    void applyMarkers();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (redraw) map.off("moveend", redraw);
      popup?.remove();
    };
  }, [ready, error, props.pending, props.scene, props.selected]);
  return (
    <div className="map-surface">
      <div ref={host} className="map-canvas" aria-label="历史地图" />
      {error && (
        <div className="map-fallback" role="status">
          <span className="fallback-symbol">山</span>
          <h2>地图暂不可用</h2>
          <p>{error}</p>
          <p>仍可选择年份，阅读政权、事件和资料来源。</p>
        </div>
      )}
      {props.pending && !error && (
        <div className="map-loading">
          正在切换到 {props.pending.scene.query.year} 年…
        </div>
      )}
      {basemapError && !error && (
        <p className="map-resource-warning">
          自然地理底图加载失败；历史条目仍可查阅。
        </p>
      )}
      <div className="map-compass" aria-hidden="true">
        <span>北</span>
        <i />
      </div>
      <button
        className="map-reset"
        onClick={() => {
          const map = mapRef.current;
          if (map && !fitTerritories(map, props.scene))
            map.easeTo({
              center: [108, 35],
              zoom: 3.35,
              duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 500,
            });
        }}
      >
        回到全图
      </button>
    </div>
  );
}
