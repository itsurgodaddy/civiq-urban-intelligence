"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cellToBoundary, isValidCell, latLngToCell } from "h3-js";
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

function zoneCollection(hotspots: GeographicHotspot[]) {
  return {
    type: "FeatureCollection" as const,
    features: hotspots.map((hotspot) => {
      const cell = isValidCell(hotspot.h3Cell)
        ? hotspot.h3Cell
        : latLngToCell(hotspot.latitude, hotspot.longitude, 8);
      const boundary = cellToBoundary(cell, true) as Array<[number, number]>;
      return {
        type: "Feature" as const,
        properties: {
          id: hotspot.id,
          category: hotspot.category,
          priority: hotspot.priority,
          reports: hotspot.reports,
          area: hotspot.area,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [boundary],
        },
      };
    }),
  };
}

export function IntelligenceMap({ hotspots, selectedId, onSelect }: IntelligenceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapLibraryRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Array<import("maplibre-gl").Marker>>([]);
  const hotspotsRef = useRef(hotspots);
  const selectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const geoJson = useMemo(() => zoneCollection(hotspots), [hotspots]);

  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !containerRef.current) return;
      mapLibraryRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: containerRef.current,
        center: [77.123, 28.724],
        zoom: 11.35,
        minZoom: 9,
        maxZoom: 17,
        attributionControl: true,
        style: {
          version: 8,
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
        map.addSource("civiq-zones", { type: "geojson", data: zoneCollection(hotspotsRef.current) });
        map.addLayer({
          id: "civiq-zone-fill",
          type: "fill",
          source: "civiq-zones",
          paint: {
            "fill-color": [
              "match", ["get", "category"],
              "Water", zoneColors.Water,
              "Roads", zoneColors.Roads,
              "Waste", zoneColors.Waste,
              "Electricity", zoneColors.Electricity,
              "#8ca49d",
            ],
            "fill-opacity": ["interpolate", ["linear"], ["get", "priority"], 0, 0.18, 5, 0.35, 8, 0.58, 10, 0.78],
          },
        });
        map.addLayer({
          id: "civiq-zone-outline",
          type: "line",
          source: "civiq-zones",
          paint: {
            "line-color": [
              "match", ["get", "category"],
              "Water", zoneColors.Water,
              "Roads", zoneColors.Roads,
              "Waste", zoneColors.Waste,
              "Electricity", zoneColors.Electricity,
              "#d7e6e1",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2.5],
            "line-opacity": 0.95,
          },
        });

        map.on("mouseenter", "civiq-zone-fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "civiq-zone-fill", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", "civiq-zone-fill", (event) => {
          const id = Number(event.features?.[0]?.properties?.id);
          const hotspot = hotspotsRef.current.find((item) => item.id === id);
          if (hotspot) selectRef.current(hotspot);
        });
        setReady(true);
      });
      map.once("error", () => setMapUnavailable(true));
    }).catch(() => setMapUnavailable(true));

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibraryRef.current;
    if (!map || !maplibregl || !ready) return;

    const source = map.getSource("civiq-zones") as import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(geoJson);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = hotspots.map((hotspot) => {
      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.className = "map-priority-marker";
      markerButton.dataset.category = hotspot.category;
      markerButton.dataset.selected = String(hotspot.id === selectedId);
      markerButton.textContent = hotspot.priority.toFixed(1);
      markerButton.title = `${hotspot.area}: ${hotspot.issue}`;
      markerButton.setAttribute("aria-label", `Open ${hotspot.area} ${hotspot.category} hotspot`);
      markerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        selectRef.current(hotspot);
      });
      return new maplibregl.Marker({ element: markerButton, anchor: "center" })
        .setLngLat([hotspot.longitude, hotspot.latitude])
        .addTo(map);
    });
  }, [geoJson, hotspots, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = hotspots.find((hotspot) => hotspot.id === selectedId);
    if (!map || !selected) return;
    map.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 12.8), duration: 750 });
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
          <Hexagon className="size-3 text-primary" /> H3 resolution 8
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl border bg-[#07100f]/92 p-3 backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zone priority</p>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Low</span>
          <div className="h-2 w-24 rounded-full bg-gradient-to-r from-sky-400/25 via-amber-300 to-red-400" />
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}
