import { latLngToCell } from "h3-js";

export const H3_RESOLUTION = 8;

export function toH3(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}
