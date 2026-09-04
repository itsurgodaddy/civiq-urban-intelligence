"use client";

import { useEffect, useRef, useState } from "react";
import { cellToBoundary, cellToLatLng, cellToParent, isValidCell, latLngToCell } from "h3-js";
import { Crosshair, Hexagon, Radio } from "lucide-react";

export type GeographicHotspot = {
  id: number;
  area: string;
  category: "Water" | "Roads" | "Waste" | "Electricity";
  issue: string;
  priority: number;
  reports: number;
  growth: number;
  latitude: number;
  longitude: number;
  h3Cell: string;
};

type IntelligenceMapProps = {
  hotspots: GeographicHotspot[];
  selectedId?: number | null;
  onSelect: (hotspot: GeographicHotspot) => void;
};

const zoneColors: Record<GeographicHotspot["category"], string> = {
  Water: "#4bb6ff",
  Roads: "#ff746d",
  Waste: "#52e6a0",
  Electricity: "#ffbd59",
};

function getH3Cell(hotspot: GeographicHotspot): string {
  return isValidCell(hotspot.h3Cell)
    ? hotspot.h3Cell
    : latLngToCell(hotspot.latitude, hotspot.longitude, 8);
}

function cellToClosedBoundary(cell: string) {
  const boundary = cellToBoundary(cell, true) as Array<[number, number]>;
  if (boundary.length > 0) boundary.push(boundary[0]);
  return boundary;
}

function getInnerRing(outerRing: [number, number][], scale: number = 0.85): [number, number][] {
  let cx = 0, cy = 0;
  const count = outerRing.length - 1;
  for (let i = 0; i < count; i++) {
    cx += outerRing[i][0];
    cy += outerRing[i][1];
  }
  cx /= count;
  cy /= count;

  return outerRing.map(v => [
    cx + (v[0] - cx) * scale,
    cy + (v[1] - cy) * scale
  ] as [number, number]);
}

const ringHeightScale: Record<number, number> = { 4: 12000, 5: 3500, 6: 1200, 7: 400 };

function createCrystalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(32, 32); ctx.lineTo(0, 64); ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(32, 32); ctx.lineTo(64, 64); ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(64, 0); ctx.lineTo(32, 32); ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(64, 64); ctx.lineTo(32, 32); ctx.fill();

  return ctx.getImageData(0, 0, 64, 64);
}

function createBadgeImage(color: string, selected: boolean) {
  const size = 80;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const center = size / 2;
  const radius = 22;

  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();

  ctx.lineWidth = selected ? 4 : 2.5;
  ctx.strokeStyle = selected ? "#ffffff" : color;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

const fadeExpression: any = [
  "interpolate", ["linear"], ["zoom"],
  7.5, ["match", ["get", "resolution"], 4, 1, 0],
  8, ["match", ["get", "resolution"], 4, 0, 5, 1, 0],
  9, ["match", ["get", "resolution"], 5, 1, 6, 0, 0],
  9.5, ["match", ["get", "resolution"], 5, 0, 6, 1, 0],
  10.5, ["match", ["get", "resolution"], 6, 1, 7, 0, 0],
  11, ["match", ["get", "resolution"], 6, 0, 7, 1, 0],
  12, ["match", ["get", "resolution"], 7, 1, 8, 0, 0],
  12.5, ["match", ["get", "resolution"], 7, 0, 8, 1, 0]
];

const fillOpacityExpression: any = [
  "interpolate", ["linear"], ["zoom"],
  7.5, ["match", ["get", "resolution"], 4, ["get", "baseOpacity"], 0],
  8, ["match", ["get", "resolution"], 4, 0, 5, ["get", "baseOpacity"], 0],
  9, ["match", ["get", "resolution"], 5, ["get", "baseOpacity"], 6, 0, 0],
  9.5, ["match", ["get", "resolution"], 5, 0, 6, ["get", "baseOpacity"], 0],
  10.5, ["match", ["get", "resolution"], 6, ["get", "baseOpacity"], 7, 0, 0],
  11, ["match", ["get", "resolution"], 6, 0, 7, ["get", "baseOpacity"], 0],
  12, ["match", ["get", "resolution"], 7, ["get", "baseOpacity"], 8, 0, 0],
  12.5, ["match", ["get", "resolution"], 7, 0, 8, ["get", "baseOpacity"], 0]
];

const textureOpacityExpression: any = [
  "interpolate", ["linear"], ["zoom"],
  7.5, ["match", ["get", "resolution"], 4, 0.7, 0],
  8, ["match", ["get", "resolution"], 4, 0, 5, 0.7, 0],
  9, ["match", ["get", "resolution"], 5, 0.7, 6, 0, 0],
  9.5, ["match", ["get", "resolution"], 5, 0, 6, 0.7, 0],
  10.5, ["match", ["get", "resolution"], 6, 0.7, 7, 0, 0],
  11, ["match", ["get", "resolution"], 6, 0, 7, 0.7, 0],
  12, ["match", ["get", "resolution"], 7, 0.7, 8, 0, 0],
  12.5, ["match", ["get", "resolution"], 7, 0, 8, 0.7, 0]
];

export function IntelligenceMap({ hotspots, selectedId, onSelect }: IntelligenceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const hotspotsRef = useRef(hotspots);
  const selectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const [ready, setReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        center: [77.123, 28.724],
        zoom: 11.35,
        pitch: 45,
        minZoom: 4,
        maxZoom: 17,
        attributionControl: true,
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
              maxzoom: 19,
            },
          },
          layers: [{
            id: "osm-base",
            type: "raster",
            source: "osm",
            paint: {
              "raster-saturation": -0.72,
              "raster-brightness-min": 0.06,
              "raster-brightness-max": 0.43,
              "raster-contrast": 0.22,
            },
          }],
        },
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: true,
      }), "top-right");

      map.once("load", () => {
        if (disposed) return;

        map.addImage("crystal-texture", createCrystalTexture());

        Object.entries(zoneColors).forEach(([category, color]) => {
          map.addImage(`badge-${category}-false`, createBadgeImage(color, false));
          map.addImage(`badge-${category}-true`, createBadgeImage(color, true));
        });

        map.addSource("zones", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        map.addSource("badges", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        map.addSource("rings3d", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        map.addLayer({
          id: "zones-fill",
          type: "fill",
          source: "zones",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": fillOpacityExpression
          }
        });

        map.addLayer({
          id: "zones-texture",
          type: "fill",
          source: "zones",
          paint: {
            "fill-pattern": "crystal-texture",
            "fill-opacity": textureOpacityExpression
          }
        });

        map.addLayer({
          id: "zones-line",
          type: "line",
          source: "zones",
          paint: {
            "line-color": ["case", ["==", ["get", "selected"], true], "#ffffff", ["get", "color"]],
            "line-width": ["case", ["==", ["get", "selected"], true], 4, 2.5],
            "line-opacity": fadeExpression
          }
        });

        map.addLayer({
          id: "badges-symbol",
          type: "symbol",
          source: "badges",
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": 1,
            "icon-allow-overlap": true,
            "text-field": ["get", "priority"],
            "text-size": 13,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
            "icon-opacity": fadeExpression,
            "text-opacity": fadeExpression
          }
        });

        [4, 5, 6, 7].forEach(res => {
          let opacityExpr;
          if (res === 4) opacityExpr = ["interpolate", ["linear"], ["zoom"], 7.5, 0.75, 8, 0];
          else if (res === 5) opacityExpr = ["interpolate", ["linear"], ["zoom"], 7.5, 0, 8, 0.75, 9, 0.75, 9.5, 0];
          else if (res === 6) opacityExpr = ["interpolate", ["linear"], ["zoom"], 9, 0, 9.5, 0.75, 10.5, 0.75, 11, 0];
          else if (res === 7) opacityExpr = ["interpolate", ["linear"], ["zoom"], 10.5, 0, 11, 0.75, 12, 0.75, 12.5, 0];

          map.addLayer({
            id: `zones-3d-extrusion-res-${res}`,
            type: "fill-extrusion",
            source: "rings3d",
            filter: ["==", ["get", "resolution"], res],
            paint: {
              "fill-extrusion-color": ["get", "color"],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "base_height"],
              "fill-extrusion-opacity": opacityExpr as any
            }
          });
        });

        const clickHandler = (e: any) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          if (props.cluster) {
            const parentCell = props.id.replace('cluster-', '');
            const contained = hotspotsRef.current.filter(h => cellToParent(getH3Cell(h), props.resolution) === parentCell);
            const [lat, lng] = cellToLatLng(parentCell);

            if (contained.length > 0) {
              const avgPriority = contained.reduce((s, h) => s + h.priority, 0) / contained.length;
              const topHotspot = contained.reduce((t, h) => h.priority > t.priority ? h : t, contained[0]);
              const totalReports = contained.reduce((s, h) => s + h.reports, 0);
              const avgGrowth = contained.reduce((s, h) => s + h.growth, 0) / contained.length;

              const clusterData = {
                isCluster: true,
                id: props.id,
                area: `Regional Cluster (${contained.length} zones)`,
                category: topHotspot.category,
                issue: `Aggregated issues across ${contained.length} hotspots`,
                priority: Number(avgPriority.toFixed(1)),
                reports: totalReports,
                growth: Number(avgGrowth.toFixed(1)),
                since: "Live",
                radius: "Regional",
                latitude: lat,
                longitude: lng,
                h3Cell: parentCell,
                containedHotspots: contained
              };
              selectRef.current(clusterData as any);
            }

            map.flyTo({ center: [lng, lat], zoom: map.getZoom() + 1.5, pitch: 50, duration: 800 });
          } else {
            const hotspot = hotspotsRef.current.find(h => h.id === props.id);
            if (hotspot) selectRef.current(hotspot);
          }
        };

        map.on("click", "badges-symbol", clickHandler);
        map.on("click", "zones-fill", clickHandler);

        map.on("mouseenter", "badges-symbol", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "badges-symbol", () => map.getCanvas().style.cursor = "");
        map.on("mouseenter", "zones-fill", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "zones-fill", () => map.getCanvas().style.cursor = "");

        setReady(true);
      });
    }).catch(() => setMapUnavailable(true));

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const zonesSource = map.getSource("zones") as import("maplibre-gl").GeoJSONSource;
    const badgesSource = map.getSource("badges") as import("maplibre-gl").GeoJSONSource;
    const ringsSource = map.getSource("rings3d") as import("maplibre-gl").GeoJSONSource;

    if (zonesSource && badgesSource && ringsSource) {
      const allZones: any[] = [];
      const allBadges: any[] = [];
      const allRings: any[] = [];
      const targetResolutions = [4, 5, 6, 7, 8];

      targetResolutions.forEach(res => {
        if (res === 8) {
          hotspots.forEach(hotspot => {
            const cell = getH3Cell(hotspot);
            allZones.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [cellToClosedBoundary(cell)] },
              properties: {
                id: hotspot.id,
                cluster: false,
                resolution: 8,
                color: zoneColors[hotspot.category],
                baseOpacity: Math.min(0.72, 0.28 + hotspot.priority * 0.045),
                selected: hotspot.id === selectedId
              }
            });
            const [lat, lng] = cellToLatLng(cell);
            allBadges.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: {
                id: hotspot.id,
                cluster: false,
                resolution: 8,
                priority: hotspot.priority.toFixed(1),
                icon: `badge-${hotspot.category}-${hotspot.id === selectedId}`
              }
            });
          });
        } else {
          const groups = new Map<string, GeographicHotspot[]>();
          hotspots.forEach(hotspot => {
            const cell = getH3Cell(hotspot);
            const parent = cellToParent(cell, res);
            if (!groups.has(parent)) groups.set(parent, []);
            groups.get(parent)!.push(hotspot);
          });

          groups.forEach((group, parentCell) => {
            const avgPriority = group.reduce((sum, h) => sum + h.priority, 0) / group.length;
            const topHotspot = group.reduce((top, h) => h.priority > top.priority ? h : top, group[0]);
            const isSelected = group.some(h => h.id === selectedId);

            allZones.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [cellToClosedBoundary(parentCell)] },
              properties: {
                id: `cluster-${parentCell}`,
                cluster: true,
                resolution: res,
                color: zoneColors[topHotspot.category],
                baseOpacity: Math.min(0.72, 0.28 + avgPriority * 0.045),
                selected: isSelected
              }
            });

            const [lat, lng] = cellToLatLng(parentCell);
            allBadges.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: {
                id: `cluster-${parentCell}`,
                cluster: true,
                resolution: res,
                priority: avgPriority.toFixed(1),
                icon: `badge-${topHotspot.category}-${isSelected}`
              }
            });

            const uniqueCategories = Array.from(new Set(group.map(h => h.category)));
            if (uniqueCategories.length > 1) {
              const outer = cellToClosedBoundary(parentCell);
              const inner = getInnerRing(outer, 0.82).reverse();

              uniqueCategories.forEach((cat, index) => {
                const scale = ringHeightScale[res] || 1000;
                const baseH = index * (scale * 1.5);
                const extH = baseH + scale;

                allRings.push({
                  type: "Feature",
                  geometry: { type: "Polygon", coordinates: [[...outer], [...inner]] },
                  properties: {
                    id: `ring-${parentCell}-${cat}`,
                    resolution: res,
                    color: zoneColors[cat],
                    base_height: baseH,
                    height: extH
                  }
                });
              });
            }
          });
        }
      });

      zonesSource.setData({ type: "FeatureCollection", features: allZones });
      badgesSource.setData({ type: "FeatureCollection", features: allBadges });
      ringsSource.setData({ type: "FeatureCollection", features: allRings });
    }
  }, [hotspots, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = hotspots.find((hotspot) => hotspot.id === selectedId);
    if (!map || !selected) return;

    const [lat, lng] = cellToLatLng(getH3Cell(selected));
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12.8), pitch: 50, duration: 750 });
  }, [hotspots, selectedId]);

  return (
    <div className="civiq-map-shell relative min-h-[540px] overflow-hidden rounded-2xl border bg-[#091513] soft-ring">
      <div ref={containerRef} className="civiq-map absolute inset-0" aria-label="Interactive Delhi civic intelligence map" />

      {!ready && !mapUnavailable && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#091513] text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Crosshair className="size-4 animate-pulse text-primary" /> Loading geographic intelligence…</span>
        </div>
      )}
      {mapUnavailable && (
        <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-amber-300/25 bg-[#17170d]/95 p-3 text-sm text-amber-100">
          The basemap is temporarily unavailable. Hotspots remain accessible from the ranked list.
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border bg-[#07100f]/92 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
          <Radio className="size-3 text-primary" /> Live Delhi layer
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border bg-[#07100f]/92 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
          <Hexagon className="size-3 text-primary" /> H3 multi-scale clustering
        </span>
      </div>
    </div>
  );
}
