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
  type?: 'apartment' | 'storage' | 'DUPLEX'; // To distinguish unit types
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
    units: [
      {
        id: "3",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 72.99,
        y: 44.14,
        path: "M 79.2 38.33 L 79.73 49.91 L 66.81 50.19 L 66.23 38.14 Z"
      },
      {
        id: "4",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 73.3,
        y: 55.63,
        path: "M 80 60.93 L 79.58 50.09 L 66.67 50.28 L 66.93 61.2 Z"
      },
      {
        id: "5",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 73.54,
        y: 67.46,
        path: "M 67.14 73.52 L 66.67 61.67 L 79.81 61.55 L 80.54 73.09 Z"
      },
      {
        id: "6",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 73.94,
        y: 77.77,
        path: "M 80.46 73.16 L 67.19 73.67 L 67.39 83.28 L 80.74 80.98 Z"
      },
      {
        id: "7",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 19.33,
        y: 85.41,
        path: "M 26.46 81.04 L 12.78 80.86 L 12.01 90.83 L 26.06 88.91 Z"
      },
      {
        id: "8",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 19.67,
        y: 75.11,
        path: "M 26.12 80.2 L 26.53 69.57 L 13.29 69.99 L 12.75 80.68 Z"
      },
      {
        id: "9",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 20.13,
        y: 64.89,
        path: "M 26.6 69.75 L 26.87 60.03 L 13.8 59.79 L 13.26 69.99 Z"
      },
      {
        id: "10",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 20.63,
        y: 54.87,
        path: "M 27 59.85 L 27.34 49.88 L 14.37 49.76 L 13.8 59.97 Z"
      },
      {
        id: "11",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 20.53,
        y: 41.39,
        path: "M 27.41 49.4 L 27.64 38.47 L 19.1 38.47 L 18.79 36.19 L 15.38 36.13 L 14.88 49.7 Z"
      },
      {
        id: "12",
        floorId: "S1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 22.14,
        y: 28.07,
        path: "M 27.81 33.07 L 28.05 26.64 L 24.87 26.64 L 24.97 22.68 L 16.23 22.74 L 15.82 29.65 L 19.33 30.25 L 20.01 32.89 Z"
      }
    ]
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
        dimensions: 110.89,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 62.3,
        y: 46.81,
        path: "M 65.3 13.0 L 79.2 13.0 L 81.8 81.8 L 58.5 84.3 L 58.3 56.8 L 54.7 56.8 L 54.7 50.2 L 52.5 50.2 L 52.5 31.0 L 65.5 31.0 Z",
        assetId: "101",
        tourUrl: "https://kuula.co/share/collection/7dlHt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/101/furnished.webp"],
        photosUnfurnished: ["plants/details/101/unfurnished.webp"],
        photosPlans: ["plants/details/101/plans.webp"],
        gallery: ["plants/details/101/gallery/1.webp", "plants/details/101/gallery/2.webp", "plants/details/101/gallery/3.webp", "plants/details/101/gallery/4.webp", "plants/details/101/gallery/5.webp", "plants/details/101/gallery/6.webp", "plants/details/101/gallery/7.webp", "plants/details/101/gallery/8.webp", "plants/details/101/gallery/9.webp", "plants/details/101/gallery/10.webp", "plants/details/101/gallery/11.webp"]
      },
      {
        id: "102",
        floorId: "1",
        price: 0,
        dimensions: 108.06,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 33.06,
        y: 58.65,
        path: "M 48.58 85.39 L 21.43 89.68 L 21.95 73.44 L 19.75 73.62 L 21.11 37.3 L 13.55 36.65 L 14.18 26.84 L 43.07 26.66 L 42.91 56.26 L 50.89 56.63 L 50.89 70.54 L 48.42 70.73 Z",
        assetId: "102",
        tourUrl: "https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/102/furnished.webp"],
        photosUnfurnished: ["plants/details/102/unfurnished.webp"],
        photosPlans: ["plants/details/102/plans.webp"],
        gallery: ["plants/details/102/gallery/1.webp", "plants/details/102/gallery/2.webp", "plants/details/102/gallery/3.webp", "plants/details/102/gallery/4.webp", "plants/details/102/gallery/5.webp", "plants/details/102/gallery/6.webp", "plants/details/102/gallery/7.webp", "plants/details/102/gallery/8.webp", "plants/details/102/gallery/9.webp", "plants/details/102/gallery/10.webp", "plants/details/102/gallery/11.webp", "plants/details/102/gallery/12.webp"]
      },
      {
        id: "1",
        floorId: "1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 16.99,
        y: 50.02,
        path: "M 20.12 57.94 L 13.24 57.94 L 14.13 41.97 L 20.48 42.25 Z"
      },
      {
        id: "2",
        floorId: "1",
        price: 0,
        dimensions: 0,
        status: 'available',
        type: 'storage',
        subtitle: 'Estacionamiento',
        x: 16.34,
        y: 70.54,
        path: "M 20.01 78.48 L 19.96 62.32 L 13.29 62.14 L 12.08 79.23 Z"
      }
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
        dimensions: 116.28,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 64.71,
        y: 44.88,
        path: "M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 64.3 71.2 L 64.0 50.8 L 52.5 50.8 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7dlMh?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp", "plants/details/x01/gallery/9.webp"]
      },
      {
        id: "202",
        floorId: "2",
        price: 0,
        dimensions: 102.1,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 34.99,
        y: 47.01,
        path: "M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7dlMZ?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp", "plants/details/x02/gallery/8.webp", "plants/details/x02/gallery/9.webp", "plants/details/x02/gallery/10.webp"]
      },
      {
        id: "203",
        identifier: "203",
        floorId: "2",
        price: 0,
        dimensions: 114.87,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 47.8,
        y: 56.26,
        path: "M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 50.8 L 64.0 50.8 L 64.3 71.2 L 34.2 76.5 Z",
        assetId: "203.1",
        tourUrl: "https://kuula.co/share/collection/7dlMd?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/203.1/furnished.webp"],
        photosUnfurnished: ["plants/details/203.1/unfurnished.webp"],
        photosPlans: ["plants/details/203.1/plans.webp"],
        gallery: ["plants/details/203/gallery/1.webp", "plants/details/203/gallery/2.webp", "plants/details/203/gallery/3.webp", "plants/details/203/gallery/4.webp", "plants/details/203/gallery/5.webp", "plants/details/203/gallery/6.webp", "plants/details/203/gallery/7.webp", "plants/details/203/gallery/8.webp", "plants/details/203/gallery/9.webp", "plants/details/203/gallery/10.webp"]
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
        dimensions: 116.28,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 64.71,
        y: 44.77,
        path: "M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 64.3 71.2 L 64.0 50.2 L 52.5 50.2 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7dlMP?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp", "plants/details/x01/gallery/9.webp"]
      },
      {
        id: "302",
        floorId: "3",
        price: 0,
        dimensions: 101.31,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 34.99,
        y: 47.01,
        path: "M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7dlMD?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp", "plants/details/x02/gallery/8.webp", "plants/details/x02/gallery/9.webp", "plants/details/x02/gallery/10.webp"]
      },
      {
        id: "303",
        identifier: "203",
        floorId: "3",
        price: 0,
        dimensions: 114.87,
        bedrooms: 2,
        bathrooms: 2.5,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 47.7,
        y: 56.11,
        path: "M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 48.8 55.6 L 48.8 50.2 L 64.0 50.2 L 64.3 71.2 L 34.2 76.5 Z",
        assetId: "203.2",
        tourUrl: "https://kuula.co/share/collection/7dlMd?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/203.2/furnished.webp"],
        photosUnfurnished: ["plants/details/203.2/unfurnished.webp"],
        photosPlans: ["plants/details/203.2/plans.webp"],
        gallery: ["plants/details/203/gallery/1.webp", "plants/details/203/gallery/2.webp", "plants/details/203/gallery/3.webp", "plants/details/203/gallery/4.webp", "plants/details/203/gallery/5.webp", "plants/details/203/gallery/6.webp", "plants/details/203/gallery/7.webp", "plants/details/203/gallery/8.webp", "plants/details/203/gallery/9.webp", "plants/details/203/gallery/10.webp"]
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
        dimensions: 116.28,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 64.38,
        y: 45.32,
        path: "M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 62.3 71.2 L 62.0 53.5 L 52.5 53.5 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z",
        assetId: "x01",
        tourUrl: "https://kuula.co/share/collection/7dlMF?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x01/furnished.webp"],
        photosUnfurnished: ["plants/details/x01/unfurnished.webp"],
        photosPlans: ["plants/details/x01/plans.webp"],
        gallery: ["plants/details/x01/gallery/1.webp", "plants/details/x01/gallery/2.webp", "plants/details/x01/gallery/3.webp", "plants/details/x01/gallery/4.webp", "plants/details/x01/gallery/5.webp", "plants/details/x01/gallery/6.webp", "plants/details/x01/gallery/7.webp", "plants/details/x01/gallery/8.webp", "plants/details/x01/gallery/9.webp"]
      },
      {
        id: "402",
        floorId: "4",
        price: 0,
        dimensions: 108.22,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        subtitle: 'Flat',
        x: 34.99,
        y: 47.01,
        path: "M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z",
        assetId: "x02",
        tourUrl: "https://kuula.co/share/collection/7dlMH?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/x02/furnished.webp"],
        photosUnfurnished: ["plants/details/x02/unfurnished.webp"],
        photosPlans: ["plants/details/x02/plans.webp"],
        gallery: ["plants/details/x02/gallery/1.webp", "plants/details/x02/gallery/2.webp", "plants/details/x02/gallery/3.webp", "plants/details/x02/gallery/4.webp", "plants/details/x02/gallery/5.webp", "plants/details/x02/gallery/6.webp", "plants/details/x02/gallery/7.webp", "plants/details/x02/gallery/8.webp", "plants/details/x02/gallery/9.webp", "plants/details/x02/gallery/10.webp"]
      },
      {
        id: "403",
        identifier: "403",
        floorId: "4",
        price: 0,
        dimensions: 104.52,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 47.3,
        y: 56.94,
        path: "M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 53.5 L 62.0 53.5 L 62.3 71.2 L 34.2 76.5 Z",
        assetId: "403.1",
        photosFurnished: ["plants/details/403.1/furnished.webp"],
        photosUnfurnished: ["plants/details/403.1/unfurnished.webp"],
        photosPlans: ["plants/details/403.1/plans.webp"],
        gallery: ["plants/details/403/gallery/1.webp", "plants/details/403/gallery/2.webp", "plants/details/403/gallery/3.webp", "plants/details/403/gallery/4.webp", "plants/details/403/gallery/5.webp", "plants/details/403/gallery/6.webp", "plants/details/403/gallery/7.webp", "plants/details/403/gallery/8.webp", "plants/details/403/gallery/9.webp", "plants/details/403/gallery/10.webp"]
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
        dimensions: 113.98,
        bedrooms: 3,
        bathrooms: 4,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 34.26,
        y: 50.84,
        path: "M 26.84 73.62 L 21.59 73.81 L 21.64 79.13 L 18.96 79.97 L 21.17 13.77 L 50.74 13.49 L 50.74 25.44 L 43.33 25.91 L 43.12 48.04 L 39.34 48.23 L 39.34 55.42 L 37.66 55.7 L 37.5 59.52 L 27.63 59.71 Z",
        assetId: "501.1",
        tourUrl: "https://kuula.co/share/collection/7dlMt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/501.1/furnished.webp"],
        photosUnfurnished: ["plants/details/501.1/unfurnished.webp"],
        photosPlans: ["plants/details/501.1/plans.webp"],
        gallery: ["plants/details/501/gallery/1.webp", "plants/details/501/gallery/2.webp", "plants/details/501/gallery/3.webp", "plants/details/501/gallery/4.webp", "plants/details/501/gallery/5.webp", "plants/details/501/gallery/6.webp", "plants/details/501/gallery/7.webp", "plants/details/501/gallery/8.webp", "plants/details/501/gallery/9.webp", "plants/details/501/gallery/10.webp", "plants/details/501/gallery/11.webp", "plants/details/501/gallery/12.webp", "plants/details/501/gallery/13.webp", "plants/details/501/gallery/14.webp", "plants/details/501/gallery/15.webp"]
      },
      {
        id: "403",
        identifier: "403",
        floorId: "5",
        price: 0,
        dimensions: 104.52,
        bedrooms: 3,
        bathrooms: 2.5,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 43.39,
        y: 61.59,
        path: "M 23.84 77.64 L 23.74 74 L 27.36 74.46 L 27.73 59.71 L 37.92 59.9 L 38.08 56.16 L 39.39 55.79 L 39.39 48.32 L 43.12 48.51 L 43.28 55.6 L 48.32 55.79 L 48.48 53.92 L 62.18 53.64 L 62.34 57.28 L 62.03 69.14 L 61.66 73.06 L 48.69 74.09 Z",
        assetId: "403.2",
        photosFurnished: ["plants/details/403.2/furnished.webp"],
        photosUnfurnished: ["plants/details/403.2/unfurnished.webp"],
        photosPlans: ["plants/details/403.2/plans.webp"],
        gallery: ["plants/details/403/gallery/1.webp", "plants/details/403/gallery/2.webp", "plants/details/403/gallery/3.webp", "plants/details/403/gallery/4.webp", "plants/details/403/gallery/5.webp", "plants/details/403/gallery/6.webp", "plants/details/403/gallery/7.webp", "plants/details/403/gallery/8.webp", "plants/details/403/gallery/9.webp", "plants/details/403/gallery/10.webp"]
      },
      {
        id: "502",
        identifier: "503",
        floorId: "5",
        price: 0,
        dimensions: 116.88,
        bedrooms: 3,
        bathrooms: 4,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 64.38,
        y: 45.32,
        path: "M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 62.3 71.2 L 62.0 53.5 L 52.5 53.5 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z",
        assetId: "502.1",
        tourUrl: "https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es",
        photosFurnished: ["plants/details/502.1/furnished.webp"],
        photosUnfurnished: ["plants/details/502.1/unfurnished.webp"],
        photosPlans: ["plants/details/502.1/plans.webp"],
        gallery: ["plants/details/502/gallery/1.webp", "plants/details/502/gallery/2.webp", "plants/details/502/gallery/3.webp", "plants/details/502/gallery/4.webp", "plants/details/502/gallery/5.webp", "plants/details/502/gallery/6.webp", "plants/details/502/gallery/7.webp", "plants/details/502/gallery/8.webp", "plants/details/502/gallery/9.webp", "plants/details/502/gallery/10.webp", "plants/details/502/gallery/11.webp", "plants/details/502/gallery/12.webp", "plants/details/502/gallery/13.webp", "plants/details/502/gallery/14.webp", "plants/details/502/gallery/15.webp"]
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
        dimensions: 113.98,
        bedrooms: 3,
        bathrooms: 4,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 36.49,
        y: 40.77,
        path: "M 27.84 75.86 L 19.54 77.26 L 22.16 15.73 L 48.06 13.96 L 47.9 25.54 L 42.33 25.72 L 42.23 27.78 L 43.59 27.5 L 42.96 59.15 L 28.31 59.24 Z",
        assetId: "501.2",
        tourUrl: "https://kuula.co/share/collection/7dlMt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/501.2/furnished.webp"],
        photosUnfurnished: ["plants/details/501.2/unfurnished.webp"],
        photosPlans: ["plants/details/501.2/plans.webp"],
        gallery: ["plants/details/501/gallery/1.webp", "plants/details/501/gallery/2.webp", "plants/details/501/gallery/3.webp", "plants/details/501/gallery/4.webp", "plants/details/501/gallery/5.webp", "plants/details/501/gallery/6.webp", "plants/details/501/gallery/7.webp", "plants/details/501/gallery/8.webp", "plants/details/501/gallery/9.webp", "plants/details/501/gallery/10.webp", "plants/details/501/gallery/11.webp", "plants/details/501/gallery/12.webp", "plants/details/501/gallery/13.webp", "plants/details/501/gallery/14.webp", "plants/details/501/gallery/15.webp"]
      },
      {
        id: "602",
        identifier: "503",
        floorId: "6",
        price: 0,
        dimensions: 116.88,
        bedrooms: 3,
        bathrooms: 4,
        status: 'available',
        type: 'DUPLEX',
        subtitle: 'Dúplex',
        x: 61.43,
        y: 42.38,
        path: "M 68.2 13.2 L 79.2 13.2 L 80.8 69.5 L 56.5 73.5 L 56.5 58.0 L 51.5 58.0 L 51.5 38.0 L 50.8 38.0 L 50.8 31.2 L 68.5 31.2 Z",
        assetId: "502.2",
        tourUrl: "https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es",
        photosFurnished: ["plants/details/502.2/furnished.webp"],
        photosUnfurnished: ["plants/details/502.2/unfurnished.webp"],
        photosPlans: ["plants/details/502.2/plans.webp"],
        gallery: ["plants/details/502/gallery/1.webp", "plants/details/502/gallery/2.webp", "plants/details/502/gallery/3.webp", "plants/details/502/gallery/4.webp", "plants/details/502/gallery/5.webp", "plants/details/502/gallery/6.webp", "plants/details/502/gallery/7.webp", "plants/details/502/gallery/8.webp", "plants/details/502/gallery/9.webp", "plants/details/502/gallery/10.webp", "plants/details/502/gallery/11.webp", "plants/details/502/gallery/12.webp", "plants/details/502/gallery/13.webp", "plants/details/502/gallery/14.webp", "plants/details/502/gallery/15.webp"]
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
