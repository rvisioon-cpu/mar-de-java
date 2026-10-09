/**
 * Tier 3: Cross-Feature Interactions E2E Tests
 * Validates cross-module consistency between floors.ts, asset-manifest.ts,
 * generate-seed.mjs, seed.sql, D1 SQLite database, and R2 URL/proxy schemes.
 */

import { describe, it, expect } from './helpers/assertion.mjs';
import {
  loadFloorsData,
  loadAssetManifest,
  D1_SQLITE_PATH,
  EXPECTED_UNITS,
  EXPECTED_FLOORS,
  getAssetUrl,
  getCanvasImageUrl,
} from './helpers/project-contracts.mjs';
import fs from 'fs';
import { execSync } from 'child_process';

export function registerTier3Tests() {
  const floors = loadFloorsData();
  const manifestData = loadAssetManifest();

  describe('Tier 3: Pairwise Interaction — floors.ts ↔ asset-manifest.ts', () => {
    it('should verify 100% of photosFurnished from floors.ts exist in asset-manifest.ts', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          if (unit.photosFurnished) {
            unit.photosFurnished.forEach((photo) => {
              expect(manifestData.allTypologyAssets).toContain(
                photo,
                `Unit ${unit.id} photosFurnished "${photo}" missing from manifest`
              );
            });
          }
        });
      });
    });

    it('should verify 100% of photosUnfurnished from floors.ts exist in asset-manifest.ts', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          if (unit.photosUnfurnished) {
            unit.photosUnfurnished.forEach((photo) => {
              expect(manifestData.allTypologyAssets).toContain(
                photo,
                `Unit ${unit.id} photosUnfurnished "${photo}" missing from manifest`
              );
            });
          }
        });
      });
    });

    it('should verify 100% of photosPlans from floors.ts exist in asset-manifest.ts', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          if (unit.photosPlans) {
            unit.photosPlans.forEach((photo) => {
              expect(manifestData.allTypologyAssets).toContain(
                photo,
                `Unit ${unit.id} photosPlans "${photo}" missing from manifest`
              );
            });
          }
        });
      });
    });

    it('should verify 100% of gallery images from floors.ts exist in asset-manifest.ts', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          if (unit.gallery) {
            unit.gallery.forEach((photo) => {
              expect(manifestData.allTypologyAssets).toContain(
                photo,
                `Unit ${unit.id} gallery image "${photo}" missing from manifest`
              );
            });
          }
        });
      });
    });
  });

  describe('Tier 3: Pairwise Interaction — floors.ts ↔ seed.sql Generation', () => {
    it('should verify seed.sql contains an INSERT for every floor in floors.ts', () => {
      const seedContent = fs.readFileSync('seed.sql', 'utf8');
      floors.forEach((floor) => {
        const expectedFloorInsert = `INSERT INTO floors (id, name, level, type, image_path) VALUES ('floor_${floor.id}', '${floor.name}', ${floor.level}`;
        expect(seedContent).toContain(expectedFloorInsert);
      });
    });

    it('should verify seed.sql contains an INSERT for every unit in floors.ts', () => {
      const seedContent = fs.readFileSync('seed.sql', 'utf8');
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          const unitId = `unit_${floor.id}_${unit.id.replace(/\s+/g, '_').toLowerCase()}`;
          const expectedUnitInsert = `'${unitId}', 'floor_${floor.id}', '${unit.identifier || unit.id}'`;
          expect(seedContent).toContain(expectedUnitInsert);
        });
      });
    });

    it('should verify duplex typing in seed.sql matches subtitle from floors.ts', () => {
      const seedContent = fs.readFileSync('seed.sql', 'utf8');
      const seedLines = seedContent.split('\n');

      const duplex501Line = seedLines.find((l) => l.includes('unit_5_501'));
      const duplex601Line = seedLines.find((l) => l.includes('unit_6_601'));
      expect(duplex501Line).toContain("'DUPLEX'");
      expect(duplex601Line).toContain("'DUPLEX'");

      const flat101Line = seedLines.find((l) => l.includes('unit_1_101'));
      expect(flat101Line).toContain("'APARTMENT'");
    });

    it('should verify area_sqm in seed.sql matches dimensions from floors.ts for all units', () => {
      const seedContent = fs.readFileSync('seed.sql', 'utf8');
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          const unitId = `unit_${floor.id}_${unit.id.replace(/\s+/g, '_').toLowerCase()}`;
          const unitLine = seedContent.split('\n').find((l) => l.includes(`'${unitId}'`));
          expect(unitLine).toBeDefined();
          expect(unitLine).toContain(String(unit.dimensions));
        });
      });
    });
  });

  describe('Tier 3: Pairwise Interaction — seed.sql ↔ D1 SQLite Database', () => {
    it('should verify all 8 floors exist in D1 SQLite with correct IDs and levels', () => {
      const queryResult = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT id, name, level FROM floors ORDER BY level ASC;"`,
        { encoding: 'utf8' }
      );
      const floorRows = queryResult.trim().split('\n');
      expect(floorRows.length).toBe(EXPECTED_FLOORS.length);

      const parsedFloors = floorRows.map((r) => {
        const [id, name, level] = r.split('|');
        return { id, name, level: parseInt(level, 10) };
      });

      expect(parsedFloors[0].id).toBe('floor_S2');
      expect(parsedFloors[0].level).toBe(-2);
      expect(parsedFloors[parsedFloors.length - 1].id).toBe('floor_6');
      expect(parsedFloors[parsedFloors.length - 1].level).toBe(6);
    });

    it('should verify exactly 12 units exist in D1 SQLite matching EXPECTED_UNITS', () => {
      const queryResult = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT id, floor_id, identifier FROM units;"`,
        { encoding: 'utf8' }
      );
      const unitRows = queryResult.trim().split('\n');
      expect(unitRows.length).toBe(EXPECTED_UNITS.length);

      EXPECTED_UNITS.forEach((expected) => {
        const expectedUnitId = `unit_${expected.floorId}_${expected.id}`;
        const match = unitRows.find((r) => r.startsWith(expectedUnitId));
        expect(match).toBeDefined(`Unit ${expectedUnitId} not found in SQLite table`);
      });
    });

    it('should verify foreign key integrity: every unit.floor_id references an existing floors.id', () => {
      const orphanedResult = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT count(*) FROM units WHERE floor_id NOT IN (SELECT id FROM floors);"`,
        { encoding: 'utf8' }
      );
      const orphanedCount = parseInt(orphanedResult.trim(), 10);
      expect(orphanedCount).toBe(0);
    });

    it('should verify tours table has exactly 11 tours (1 building + 10 units)', () => {
      const toursResult = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT count(*) FROM tours;"`,
        { encoding: 'utf8' }
      );
      const count = parseInt(toursResult.trim(), 10);
      expect(count).toBe(11);
    });
  });

  describe('Tier 3: Pairwise Interaction — assets.ts ↔ R2 Storage & Proxy Contracts', () => {
    it('should verify src/utils/assets.ts source implements required proxy routing for videos', () => {
      const assetsTsSource = fs.readFileSync('src/utils/assets.ts', 'utf8');
      expect(assetsTsSource).toContain("cleanPathNoSlash.toLowerCase().endsWith(ext)");
      expect(assetsTsSource).toContain("return `/api/r2/${cleanPathNoSlash}`;");
      expect(assetsTsSource).toContain("getCanvasImageUrl");
    });

    it('should route image assets to public CDN URL or relative asset path', () => {
      const imagePath = 'plants/details/101/furnished.webp';
      const resolved = getAssetUrl(imagePath);
      expect(resolved.startsWith('/api/r2/')).toBeFalsy();
      expect(resolved.endsWith('plants/details/101/furnished.webp')).toBeTruthy();
    });

    it('should strictly route MP4 video assets through same-origin /api/r2/ proxy', () => {
      const videoPath = 'plants/details/101/transitions/furnished_to_unfurnished.mp4';
      const resolved = getAssetUrl(videoPath);
      expect(resolved.startsWith('/api/r2/')).toBeTruthy();
      expect(resolved).toBe('/api/r2/plants/details/101/transitions/furnished_to_unfurnished.mp4');
    });

    it('should route canvas images through same-origin /api/r2/ proxy for CORS safety', () => {
      const floorPlanPath = 'plants/floor_1.webp';
      const resolved = getCanvasImageUrl(floorPlanPath);
      expect(resolved.startsWith('/api/r2/')).toBeTruthy();
      expect(resolved).toBe('/api/r2/plants/floor_1.webp');
    });

    it('should route public ICONOS/ assets to same-origin without /api/r2/ proxy prefix', () => {
      const iconPath = 'ICONOS/proyecto/logo-proyecto.png';
      const resolved = getAssetUrl(iconPath);
      expect(resolved).toBe('/ICONOS/proyecto/logo-proyecto.png');
    });
  });

  describe('Tier 3: Pairwise Interaction — Duplex Multi-Level & Shared Gallery Consistency', () => {
    it('should verify Duplex 501 levels (501.1 and 501.2) share identical dimensions, rooms, tour, and gallery', () => {
      const floor5 = floors.find((f) => f.id === '5');
      const floor6 = floors.find((f) => f.id === '6');
      const unit501 = floor5.units.find((u) => u.id === '501');
      const unit601 = floor6.units.find((u) => u.id === '601');

      expect(unit501).toBeDefined();
      expect(unit601).toBeDefined();
      expect(unit601.identifier).toBe('501');
      expect(unit501.dimensions).toBe(unit601.dimensions);
      expect(unit501.bedrooms).toBe(unit601.bedrooms);
      expect(unit501.bathrooms).toBe(unit601.bathrooms);
      expect(unit501.tourUrl).toBe(unit601.tourUrl);
      expect(unit501.gallery).toEqual(unit601.gallery);

      // But distinct base view asset IDs
      expect(unit501.assetId).toBe('501.1');
      expect(unit601.assetId).toBe('501.2');
    });

    it('should verify Duplex 502 levels (502.1 and 502.2) share identical dimensions, rooms, tour, and gallery', () => {
      const floor5 = floors.find((f) => f.id === '5');
      const floor6 = floors.find((f) => f.id === '6');
      const unit502 = floor5.units.find((u) => u.id === '502');
      const unit602 = floor6.units.find((u) => u.id === '602');

      expect(unit502).toBeDefined();
      expect(unit602).toBeDefined();
      expect(unit602.identifier).toBe('502');
      expect(unit502.dimensions).toBe(unit602.dimensions);
      expect(unit502.bedrooms).toBe(unit602.bedrooms);
      expect(unit502.bathrooms).toBe(unit602.bathrooms);
      expect(unit502.tourUrl).toBe(unit602.tourUrl);
      expect(unit502.gallery).toEqual(unit602.gallery);

      // But distinct base view asset IDs
      expect(unit502.assetId).toBe('502.1');
      expect(unit602.assetId).toBe('502.2');
    });
  });
}
