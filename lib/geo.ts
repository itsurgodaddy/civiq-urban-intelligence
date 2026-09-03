import { latLngToCell } from "h3-js";

export const CIVIQ_H3_RESOLUTION = 8;

export type GeoPoint = {
  latitude: number;
  longitude: number;
  source: "gps" | "area";
};

const DELHI_AREAS: Array<{ names: string[]; latitude: number; longitude: number }> = [
  { names: ["dtu", "delhi technological university", "shahbad daulatpur"], latitude: 28.7501, longitude: 77.1177 },
  { names: ["sector 17", "rohini sector 17"], latitude: 28.7407, longitude: 77.1136 },
  { names: ["sector 24", "rohini sector 24"], latitude: 28.7242, longitude: 77.0895 },
  { names: ["model town"], latitude: 28.7029, longitude: 77.1912 },
  { names: ["rithala"], latitude: 28.7208, longitude: 77.107 },
  { names: ["sector 11", "rohini sector 11"], latitude: 28.7312, longitude: 77.1212 },
  { names: ["pitampura"], latitude: 28.6948, longitude: 77.131 },
];

function validCoordinate(latitude?: number, longitude?: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Number(latitude) >= -90 && Number(latitude) <= 90
    && Number(longitude) >= -180 && Number(longitude) <= 180;
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function resolveCoordinates(location: string, latitude?: number, longitude?: number): GeoPoint {
  if (validCoordinate(latitude, longitude)) {
    return { latitude: Number(latitude), longitude: Number(longitude), source: "gps" };
  }

  const normalized = location.toLowerCase();
  const knownArea = DELHI_AREAS.find((area) => area.names.some((name) => normalized.includes(name)));
  if (knownArea) return { latitude: knownArea.latitude, longitude: knownArea.longitude, source: "area" };

  // Keep unknown demo locations inside Delhi while assigning them a stable, repeatable point.
  const hash = stableHash(normalized || "delhi");
  const latitudeOffset = ((hash % 1600) - 800) / 10000;
  const longitudeOffset = (((hash >> 6) % 1600) - 800) / 10000;
  return {
    latitude: Number((28.7041 + latitudeOffset).toFixed(6)),
    longitude: Number((77.1025 + longitudeOffset).toFixed(6)),
    source: "area",
  };
}

export function h3CellFor(point: Pick<GeoPoint, "latitude" | "longitude">) {
  return latLngToCell(point.latitude, point.longitude, CIVIQ_H3_RESOLUTION);
}
