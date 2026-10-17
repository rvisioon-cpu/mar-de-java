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
        x: 32.7,
        y: 58.67,
        path: "M 13.5 26.2 L 43.5 26.2 L 43.5 55.6 L 49.5 55.6 L 49.5 70.5 L 48.6 70.5 L 48.6 86.2 L 20.7 89.2 L 21.2 74.8 L 19.6 74.8 L 21.2 37.2 L 13.0 37.2 Z",
        assetId: "102",
        tourUrl: "https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es",
        photosFurnished: ["plants/details/102/furnished.webp"],
        photosUnfurnished: ["plants/details/102/unfurnished.webp"],
        photosPlans: ["plants/details/102/plans.webp"],
        gallery: ["plants/details/102/gallery/1.webp", "plants/details/102/gallery/2.webp", "plants/details/102/gallery/3.webp", "plants/details/102/gallery/4.webp", "plants/details/102/gallery/5.webp", "plants/details/102/gallery/6.webp", "plants/details/102/gallery/7.webp", "plants/details/102/gallery/8.webp", "plants/details/102/gallery/9.webp", "plants/details/102/gallery/10.webp", "plants/details/102/gallery/11.webp", "plants/details/102/gallery/12.webp"]
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
        x: 34.48,
        y: 43.56,
        path: "M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.5 L 30.2 44.5 L 30.2 59.8 L 27.2 59.8 L 27.2 74.5 L 20.2 74.5 Z",
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
        x: 42.37,
        y: 57.52,
        path: "M 30.2 44.5 L 43.5 44.5 L 43.5 55.6 L 48.8 55.6 L 48.8 53.5 L 62.0 53.5 L 62.3 71.2 L 27.2 77.2 L 27.2 59.8 L 30.2 59.8 Z",
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
        x: 37.95,
        y: 45.67,
        path: "M 21.2 13.2 L 48.5 13.2 L 48.5 25.8 L 43.5 25.8 L 43.5 55.6 L 48.8 55.6 L 48.8 58.0 L 56.5 58.0 L 56.5 73.5 L 19.5 77.5 L 20.0 55.0 L 20.6 35.0 Z",
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
