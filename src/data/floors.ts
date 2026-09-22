// ============================================================================
// HISTORICAL STATIC DATA — fallback used when the D1 database is unavailable.
// The source of truth is the D1 database (see src/lib/db/schema.ts and seed.sql).
// generate-seed.mjs builds the floors/units seed from this file.
// ============================================================================

export type UnitStatus = 'available' | 'reserved' | 'sold';

export const UnitStatusString: Record<UnitStatus, string> = {
    available: 'Disponible',
    reserved: 'Separado',
    sold: 'Vendido'
}

export interface Unit {
  id: string;        // e.g. "410"
  identifier?: string; // e.g. "410"
  floorId: string;   // e.g. "4"
  price: number;     // e.g. 1000
  dimensions: number; // m2, e.g. 90
  bedrooms?: number;  // Optional for storage units
  bathrooms?: number; // Optional for storage units
  status: UnitStatus;
  type?: 'apartment' | 'storage'; // To distinguish unit types
  subtitle?: string; // e.g. "Flat", "Duplex", "Bodega"
  description?: string;
  images?: string[];
  tourUrl?: string; // Kuula or other 360 tour URL
  assetId?: string; // Folder name for assets if different from ID (e.g. 'x01')
  x?: number; // Percentage 0-100
  y?: number; // Percentage 0-100
  path?: string; // SVG Path 'd' attribute for irregular shapes (0-100 coordinate space)
  photosFurnished?: string[];
  photosUnfurnished?: string[];
  photosPlans?: string[];
  photosBalcony?: string[];
  gallery?: string[];
}

import { getAssetUrl } from '../utils/assets';

const floorS2 = getAssetUrl('plants/floor_s2.webp');
const floorS1 = getAssetUrl('plants/floor_s1.webp');
const floor1 = getAssetUrl('plants/floor_1.webp');
const floor2 = getAssetUrl('plants/floor_2.webp');
const floor3 = getAssetUrl('plants/floor_3.webp');
const floor4 = getAssetUrl('plants/floor_4.webp');
const floor5 = getAssetUrl('plants/floor_5.webp');
const floor6 = getAssetUrl('plants/floor_6.webp');

export interface Floor {
  id: string;
  name: string;
  level: number;
  floorPlanImage: string;
  units: Unit[];
}

// ============================================================================
// Residencial Mar de Java — 6 floors, 2 basements (S1, S2).
// Bedrooms / bathrooms / area (m²) provided by the client.
// NOTE: units 301/401 mirror the 201 stack and 302/402 mirror the 202 stack
// (the client left those rows blank; stacked lines share the same layout).
// Prices are TBD (0) and unit polygons (path/x/y) are pending the floor plans.
// ============================================================================
export const floorsData: Floor[] = [
  {
    id: "S2",
    name: "S2",
    level: -2,
    floorPlanImage: floorS2,
    units: []
  },
  {
    id: "S1",
    name: "S1",
    level: -1,
    floorPlanImage: floorS1,
    units: []
  },
  {
    id: "1",
    name: "1",
    level: 1,
    floorPlanImage: floor1,
    units: [
      {
        id: "101",
        floorId: "1",
        price: 0,
        dimensions: 108.42,
        bedrooms: 1,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 57.43,
        y: 59.4,
        path: "M 14.49 52.6 L 14.33 77.8 L 80.91 72.69 L 80.75 61.16 L 85.2 61.34 L 85.51 51.12 L 75.05 51.3 L 75.1 61.16 L 61.51 61.06 L 61.3 51.95 L 47.7 52.32 L 47.91 62.37 L 37.34 62.27 L 36.92 52.42 Z",
        assetId: "101",
        tourUrl: "https://kuula.co/share/collection/7TgV8?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/101/furnished.webp"],
        photosUnfurnished: ["plants/details/101/unfurnished.webp"],
        photosPlans: ["plants/details/101/plans.webp"],
        gallery: ["plants/details/101/gallery/1.webp", "plants/details/101/gallery/2.webp", "plants/details/101/gallery/3.webp", "plants/details/101/gallery/4.webp", "plants/details/101/gallery/5.webp", "plants/details/101/gallery/6.webp", "plants/details/101/gallery/7.webp", "plants/details/101/gallery/8.webp", "plants/details/101/gallery/9.webp"]
      },
      {
        id: "102",
        floorId: "1",
        price: 0,
        dimensions: 80.11,
        bedrooms: 1,
        bathrooms: 1.5,
        status: 'available',
        subtitle: 'Flat',
        x: 62.7,
        y: 45.04,
        path: "M 41.63 44.33 L 47.8 44.51 L 47.8 51.95 L 61.24 51.95 L 61.45 61.16 L 75.16 61.16 L 75 51.21 L 85.46 51.02 L 85.93 39.31 L 84.15 39.31 L 83.94 27.41 L 43.36 26.85 L 43.51 40.14 L 41.42 40.24 Z",
        assetId: "102",
        tourUrl: "https://kuula.co/share/collection/7TgVC?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/102/furnished.webp"],
        photosUnfurnished: ["plants/details/102/unfurnished.webp"],
        photosPlans: ["plants/details/102/plans.webp"],
        gallery: ["plants/details/102/gallery/1.webp", "plants/details/102/gallery/2.webp", "plants/details/102/gallery/3.webp", "plants/details/102/gallery/4.webp", "plants/details/102/gallery/5.webp", "plants/details/102/gallery/6.webp", "plants/details/102/gallery/7.webp", "plants/details/102/gallery/8.webp"]
      },
    ]
  },
  {
    id: "2",
    name: "2",
    level: 2,
    floorPlanImage: floor2,
    units: [
      {
        id: "201",
        floorId: "2",
        price: 0,
        dimensions: 122.82,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.89,
        y: 59.76,
        path: "M 81.38 73.52 L 81.17 61.34 L 71.18 61.44 L 70.92 51.3 L 61.45 51.12 L 61.4 58.83 L 47.75 59.39 L 47.8 62.09 L 37.55 62.27 L 37.5 52.42 L 19.82 52.79 L 19.72 56.14 L 16.42 56.42 L 16.47 77.62 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7TgVV?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp"]
      },
      {
        id: "202",
        floorId: "2",
        price: 0,
        dimensions: 134.03,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.45,
        y: 41.42,
        path: "M 84.41 39.4 L 84.26 26.94 L 50 26.66 L 49.79 39.96 L 39.44 39.96 L 39.59 26.29 L 16.21 25.55 L 16.58 51.3 L 19.56 51.02 L 19.56 52.98 L 37.55 52.23 L 37.76 43.96 L 61.14 44.42 L 61.45 51.02 L 71.08 51.12 L 70.87 39.96 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7TgVs?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp"]
      },
    ]
  },
  {
    id: "3",
    name: "3",
    level: 3,
    floorPlanImage: floor3,
    units: [
      {
        id: "301",
        floorId: "3",
        price: 0,
        dimensions: 122.82,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.89,
        y: 59.76,
        path: "M 81.38 73.52 L 81.17 61.34 L 71.18 61.44 L 70.92 51.3 L 61.45 51.12 L 61.4 58.83 L 47.75 59.39 L 47.8 62.09 L 37.55 62.27 L 37.5 52.42 L 19.82 52.79 L 19.72 56.14 L 16.42 56.42 L 16.47 77.62 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7TgV3?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp"]
      },
      {
        id: "302",
        floorId: "3",
        price: 0,
        dimensions: 134.03,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.45,
        y: 41.42,
        path: "M 84.41 39.4 L 84.26 26.94 L 50 26.66 L 49.79 39.96 L 39.44 39.96 L 39.59 26.29 L 16.21 25.55 L 16.58 51.3 L 19.56 51.02 L 19.56 52.98 L 37.55 52.23 L 37.76 43.96 L 61.14 44.42 L 61.45 51.02 L 71.08 51.12 L 70.87 39.96 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7TgVy?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp"]
      },
    ]
  },
  {
    id: "4",
    name: "4",
    level: 4,
    floorPlanImage: floor4,
    units: [
      {
        id: "401",
        floorId: "4",
        price: 0,
        dimensions: 122.82,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.89,
        y: 59.76,
        path: "M 81.38 73.52 L 81.17 61.34 L 71.18 61.44 L 70.92 51.3 L 61.45 51.12 L 61.4 58.83 L 47.75 59.39 L 47.8 62.09 L 37.55 62.27 L 37.5 52.42 L 19.82 52.79 L 19.72 56.14 L 16.42 56.42 L 16.47 77.62 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7TgVS?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp"]
      },
      {
        id: "402",
        floorId: "4",
        price: 0,
        dimensions: 134.03,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 47.45,
        y: 41.42,
        path: "M 84.41 39.4 L 84.26 26.94 L 50 26.66 L 49.79 39.96 L 39.44 39.96 L 39.59 26.29 L 16.21 25.55 L 16.58 51.3 L 19.56 51.02 L 19.56 52.98 L 37.55 52.23 L 37.76 43.96 L 61.14 44.42 L 61.45 51.02 L 71.08 51.12 L 70.87 39.96 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7TgVB?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp"]
      },
    ]
  },
  {
    id: "5",
    name: "5",
    level: 5,
    floorPlanImage: floor5,
    units: [
      {
        id: "501",
        floorId: "5",
        price: 0,
        dimensions: 250.95,
        bedrooms: 3,
        bathrooms: 2,
        status: 'available',
        subtitle: 'Dúplex',
        x: 48.34,
        y: 60.26,
        path: "M 81.37 73.16 L 81.11 61.32 L 71.35 61.24 L 70.97 51.21 L 61.42 51.21 L 61.46 58.9 L 47.84 59.28 L 47.79 62.22 L 37.69 62.45 L 37.56 52.57 L 19.91 53.32 L 19.65 55.96 L 16.39 56.41 L 16.3 77.54 Z",
        assetId: "501.1",
        tourUrl: "https://kuula.co/share/collection/7TgVr?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/501.1/furnished.webp"],
        photosUnfurnished: ["plants/details/501.1/unfurnished.webp"],
        photosPlans: ["plants/details/501.1/plans.webp"],
        gallery: ["plants/details/501/gallery/1.webp", "plants/details/501/gallery/2.webp", "plants/details/501/gallery/3.webp", "plants/details/501/gallery/4.webp", "plants/details/501/gallery/5.webp", "plants/details/501/gallery/6.webp", "plants/details/501/gallery/7.webp", "plants/details/501/gallery/8.webp", "plants/details/501/gallery/9.webp", "plants/details/501/gallery/10.webp", "plants/details/501/gallery/11.webp", "plants/details/501/gallery/12.webp"]
      },
      {
        id: "502",
        floorId: "5",
        price: 0,
        dimensions: 267.89,
        bedrooms: 2,
        bathrooms: 2,
        status: 'available',
        subtitle: 'Dúplex',
        x: 46.5,
        y: 42.03,
        path: "M 84.47 39.31 L 84.21 27.13 L 49.84 26.66 L 50 39.59 L 39.75 39.77 L 39.7 26.38 L 16.37 25.64 L 16.68 50.84 L 19.67 50.65 L 19.82 52.7 L 30.23 52.7 L 37.76 52.6 L 37.6 44.24 L 61.04 44.33 L 61.45 50.93 L 71.08 51.21 L 70.87 39.77 Z",
        assetId: "502.1",
        tourUrl: "https://kuula.co/share/collection/7Tgj7?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/502.1/furnished.webp"],
        photosUnfurnished: ["plants/details/502.1/unfurnished.webp"],
        photosPlans: ["plants/details/502.1/plans.webp"],
        gallery: ["plants/details/502/gallery/1.webp", "plants/details/502/gallery/2.webp", "plants/details/502/gallery/3.webp", "plants/details/502/gallery/4.webp", "plants/details/502/gallery/5.webp", "plants/details/502/gallery/6.webp", "plants/details/502/gallery/7.webp", "plants/details/502/gallery/8.webp", "plants/details/502/gallery/9.webp", "plants/details/502/gallery/10.webp", "plants/details/502/gallery/11.webp", "plants/details/502/gallery/12.webp"]
      },
    ]
  },
  {
    id: "6",
    name: "6",
    level: 6,
    floorPlanImage: floor6,
    units: [
      {
        id: "601",
        identifier: "501",
        floorId: "6",
        price: 0,
        dimensions: 250.95,
        bedrooms: 3,
        bathrooms: 2,
        status: 'available',
        subtitle: 'Dúplex',
        x: 47.59,
        y: 59.12,
        path: "M 80.89 61.74 L 81.06 73.96 L 16.2 77.57 L 16.5 56.22 L 19.75 56.13 L 19.75 52.61 L 35.71 52.79 L 35.76 57.57 L 47.57 57.39 L 47.87 59.1 L 61.35 59.19 L 61.45 51.35 L 71.08 51.17 L 71.28 60.9 Z",
        assetId: "501.2",
        tourUrl: "https://kuula.co/share/collection/7TgVr?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/501.2/furnished.webp"],
        photosUnfurnished: ["plants/details/501.2/unfurnished.webp"],
        photosPlans: ["plants/details/501.2/plans.webp"],
        gallery: ["plants/details/501/gallery/1.webp", "plants/details/501/gallery/2.webp", "plants/details/501/gallery/3.webp", "plants/details/501/gallery/4.webp", "plants/details/501/gallery/5.webp", "plants/details/501/gallery/6.webp", "plants/details/501/gallery/7.webp", "plants/details/501/gallery/8.webp", "plants/details/501/gallery/9.webp", "plants/details/501/gallery/10.webp", "plants/details/501/gallery/11.webp", "plants/details/501/gallery/12.webp"]
      },
      {
        id: "602",
        identifier: "502",
        floorId: "6",
        price: 0,
        dimensions: 267.89,
        bedrooms: 2,
        bathrooms: 2,
        status: 'available',
        subtitle: 'Dúplex',
        x: 48.6,
        y: 40.89,
        path: "M 84.31 40.38 L 84.07 28.19 L 70.81 27.93 L 70.66 26.87 L 49.85 26.52 L 49.8 39.94 L 39.72 39.94 L 39.67 26.16 L 16.33 25.63 L 16.68 51.5 L 19.76 51.15 L 20.01 52.74 L 35.25 52.47 L 35.25 48.85 L 37.54 48.85 L 37.59 44.09 L 61.22 44.26 L 61.47 51.06 L 71.01 50.71 L 70.91 40.64 Z",
        assetId: "502.2",
        tourUrl: "https://kuula.co/share/collection/7Tgj7?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/502.2/furnished.webp"],
        photosUnfurnished: ["plants/details/502.2/unfurnished.webp"],
        photosPlans: ["plants/details/502.2/plans.webp"],
        gallery: ["plants/details/502/gallery/1.webp", "plants/details/502/gallery/2.webp", "plants/details/502/gallery/3.webp", "plants/details/502/gallery/4.webp", "plants/details/502/gallery/5.webp", "plants/details/502/gallery/6.webp", "plants/details/502/gallery/7.webp", "plants/details/502/gallery/8.webp", "plants/details/502/gallery/9.webp", "plants/details/502/gallery/10.webp", "plants/details/502/gallery/11.webp", "plants/details/502/gallery/12.webp"]
      },
    ]
  }
];

// The floor shown by default when "entering" the building (its top apartment
// floor). Used by the entry transition and preloaders so the building's floor
// count isn't hardcoded. Falls back to the static data when the live (DB) list
// is empty.
export function getEntryFloorId(floors?: Floor[]): string {
  const list = floors && floors.length > 0 ? floors : floorsData;
  const apartments = list.filter(f => f.id.toLowerCase() !== 'pb' && !f.id.toLowerCase().startsWith('s'));
  const pool = apartments.length > 0 ? apartments : list;
  if (pool.length === 0) return '1';
  return [...pool].sort((a, b) => b.level - a.level)[0].id;
}
