// ============================================================================
// HISTORICAL STATIC DATA — DO NOT USE IN PRODUCTION
// This file is kept as a reference. The source of truth is the D1 database.
// See: src/lib/db/schema.ts and seed.sql for the database schema and seed data.
// ============================================================================

import { floorsData } from './floors';
import { getAssetUrl } from '../utils/assets';
const face0Day = getAssetUrl('building/photos/face_0_daylight.png');

export interface Tour {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  type: 'unit' | 'building';
  target: string;
  floorName?: string;
}

const buildingTarget= 'https://kuula.co/share/collection/7dhMt?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es';

export const getTours = (): Tour[] => {
  const tours: Tour[] = [];

  tours.push({
    id: 'building-main',
    title: 'Edificio Principal',
    subtitle: 'Showroom Virtual',
    thumbnail: face0Day,
    type: 'building',
    target: buildingTarget
  });

  const seenIds = new Set<string>();

  floorsData.forEach(floor => {
    floor.units.forEach(unit => {
      // Logic to prevent duplicate IDs (e.g. 801 appearing on floor 8 and 9)
      // Only include if not seen before OR if it has a unique subtitle to distinguish it?
      // User requested "don't repeat twice", so strict deduplication by ID seems appropriate.
      if (unit.tourUrl && !seenIds.has(unit.id)) {
        seenIds.add(unit.id);
        
        // Use the same poster image as in Unit Details
        const assetId = unit.assetId || unit.id;
        const thumb = getAssetUrl(`plants/details/${assetId}/poster.png`);

        tours.push({
          id: `unit-${unit.id}`,
          title: `Unidad ${unit.id}`,
          subtitle: unit.subtitle || 'Departamento',
          thumbnail: thumb,
          type: 'unit',
          target: unit.tourUrl,
          floorName: floor.name
        });
      }
    });
  });

  return tours;
};
