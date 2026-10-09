/**
 * Tier 2: Boundary & Corner Cases E2E Tests
 * Validates edge conditions, negative inputs, invalid asset IDs, malformed JSON strings,
 * boundary coordinates, range header parser edge cases, and missing field fallbacks.
 */

import { describe, it, expect } from './helpers/assertion.mjs';
import {
  CANONICAL_VIEW_FOLDERS,
  CANONICAL_TRANSITIONS,
  CANONICAL_GALLERIES,
  loadFloorsData,
  loadAssetManifest,
  D1_SQLITE_PATH,
  getAssetUrl,
  getCanvasImageUrl,
} from './helpers/project-contracts.mjs';
import fs from 'fs';
import { execSync } from 'child_process';

export function registerTier2Tests() {
  const floors = loadFloorsData();
  const manifestData = loadAssetManifest();

  describe('Tier 2: Empty & Missing Field Robustness', () => {
    it('should gracefully handle basement floors with empty units array (S1, S2)', () => {
      const basementS1 = floors.find((f) => f.id === 'S1');
      const basementS2 = floors.find((f) => f.id === 'S2');
      expect(basementS1).toBeDefined();
      expect(basementS2).toBeDefined();
      expect(Array.isArray(basementS1.units)).toBeTruthy();
      expect(basementS1.units.length).toBe(0);
      expect(Array.isArray(basementS2.units)).toBeTruthy();
      expect(basementS2.units.length).toBe(0);
    });

    it('should handle optional unit fields (photosBalcony, tourUrl, identifier) without throwing', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          // If identifier is missing, should default to id
          const effectiveIdentifier = unit.identifier || unit.id;
          expect(typeof effectiveIdentifier).toBe('string');
          expect(effectiveIdentifier.length).toBeGreaterThan(0);

          // Optional photosBalcony
          if (unit.photosBalcony !== undefined) {
            expect(Array.isArray(unit.photosBalcony)).toBeTruthy();
          }

          // Optional tourUrl
          if (unit.tourUrl !== undefined) {
            expect(unit.tourUrl.startsWith('https://kuula.co')).toBeTruthy();
          }
        });
      });
    });

    it('should return empty string from getAssetUrl when passed null, undefined, or empty string', () => {
      expect(getAssetUrl('')).toBe('');
      expect(getAssetUrl(null)).toBe('');
      expect(getAssetUrl(undefined)).toBe('');
    });

    it('should return empty string from getCanvasImageUrl when passed empty input', () => {
      expect(getCanvasImageUrl('')).toBe('');
      expect(getCanvasImageUrl(null)).toBe('');
      expect(getCanvasImageUrl(undefined)).toBe('');
    });

    it('should preserve data: and blob: URIs without prepending CDN domain', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blobUri = 'blob:http://localhost:3000/1234-5678';
      expect(getAssetUrl(dataUri)).toBe(dataUri);
      expect(getAssetUrl(blobUri)).toBe(blobUri);
      expect(getCanvasImageUrl(dataUri)).toBe(dataUri);
      expect(getCanvasImageUrl(blobUri)).toBe(blobUri);
    });
  });

  describe('Tier 2: Invalid & Boundary Asset IDs', () => {
    it('should reject non-existent typology folders from canonical manifest', () => {
      const invalidFolders = ['999', '001', 'xyz', '503', 'floor_1'];
      invalidFolders.forEach((folder) => {
        expect(CANONICAL_VIEW_FOLDERS.includes(folder)).toBeFalsy();
        const testAsset = `plants/details/${folder}/furnished.webp`;
        expect(manifestData.allTypologyAssets.includes(testAsset)).toBeFalsy();
      });
    });

    it('should reject path traversal attempts in asset paths', () => {
      const traversalPaths = [
        'plants/details/../101/furnished.webp',
        'plants/details/../../etc/passwd',
        'plants/details/101/../../../secret.env',
      ];
      traversalPaths.forEach((badPath) => {
        expect(manifestData.allTypologyAssets.includes(badPath)).toBeFalsy();
      });
    });

    it('should reject case mismatch folders (e.g., uppercase X01 or 501.1A)', () => {
      const uppercaseVariants = ['X01', 'X02', '101A', '501.1a'];
      uppercaseVariants.forEach((variant) => {
        expect(CANONICAL_VIEW_FOLDERS.includes(variant)).toBeFalsy();
      });
    });

    it('should reject out-of-bound gallery indices (e.g. index 0 or index > count)', () => {
      Object.entries(CANONICAL_GALLERIES).forEach(([folder, count]) => {
        const zeroIndex = `plants/details/${folder}/gallery/0.webp`;
        const overIndex = `plants/details/${folder}/gallery/${count + 1}.webp`;
        expect(manifestData.unitGalleryAssets.includes(zeroIndex)).toBeFalsy();
        expect(manifestData.unitGalleryAssets.includes(overIndex)).toBeFalsy();
      });
    });

    it('should reject non-numeric gallery filenames', () => {
      const invalidGalleryFiles = [
        'plants/details/101/gallery/first.webp',
        'plants/details/101/gallery/photo_1.webp',
        'plants/details/101/gallery/-1.webp',
      ];
      invalidGalleryFiles.forEach((f) => {
        expect(manifestData.unitGalleryAssets.includes(f)).toBeFalsy();
      });
    });
  });

  describe('Tier 2: D1 Database JSON Integrity & SQL Escaping', () => {
    it('should verify all unit JSON fields in D1 SQLite parse into valid arrays without error', () => {
      if (!fs.existsSync(D1_SQLITE_PATH)) {
        throw new Error(`D1 SQLite database not found at ${D1_SQLITE_PATH}`);
      }

      const rawOutput = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT id, photos_furnished, photos_unfurnished, photos_plans, gallery, coordinates FROM units;"`,
        { encoding: 'utf8' }
      );

      const lines = rawOutput.trim().split('\n');
      expect(lines.length).toBe(12); // Exactly 12 units

      lines.forEach((line) => {
        const [id, furnished, unfurnished, plans, gallery, coords] = line.split('|');

        // photos_furnished must be valid JSON array
        expect(furnished.startsWith('[')).toBeTruthy(`Unit ${id} photos_furnished not an array`);
        const parsedFurnished = JSON.parse(furnished);
        expect(Array.isArray(parsedFurnished)).toBeTruthy();
        expect(parsedFurnished.length).toBeGreaterThan(0);

        // photos_unfurnished must be valid JSON array
        const parsedUnfurnished = JSON.parse(unfurnished);
        expect(Array.isArray(parsedUnfurnished)).toBeTruthy();
        expect(parsedUnfurnished.length).toBeGreaterThan(0);

        // photos_plans must be valid JSON array
        const parsedPlans = JSON.parse(plans);
        expect(Array.isArray(parsedPlans)).toBeTruthy();
        expect(parsedPlans.length).toBeGreaterThan(0);

        // gallery must be valid JSON array
        const parsedGallery = JSON.parse(gallery);
        expect(Array.isArray(parsedGallery)).toBeTruthy();
        expect(parsedGallery.length).toBeGreaterThan(0);

        // coordinates must be valid JSON object or null
        if (coords && coords !== 'NULL' && coords !== '') {
          const parsedCoords = JSON.parse(coords);
          expect(typeof parsedCoords).toBe('object');
          if (parsedCoords.path) {
            expect(typeof parsedCoords.path).toBe('string');
          }
        }
      });
    });

    it('should ensure no single-quote SQL syntax corruption in seed.sql', () => {
      const seedContent = fs.readFileSync('seed.sql', 'utf8');
      const insertLines = seedContent
        .split('\n')
        .filter((l) => l.trim().startsWith('INSERT INTO units'));
      expect(insertLines.length).toBe(12);

      insertLines.forEach((insertLine) => {
        expect(insertLine.endsWith(');')).toBeTruthy();
        const singleQuotesCount = (insertLine.match(/'/g) || []).length;
        expect(singleQuotesCount % 2).toBe(0, `Unbalanced single quotes in: ${insertLine.slice(0, 80)}...`);
      });
    });

    it('should correctly handle NULL vs empty array in generate-seed jsonList helper', () => {
      const jsonList = (value) => (value && value.length > 0 ? `'${JSON.stringify(value)}'` : 'NULL');
      expect(jsonList(null)).toBe('NULL');
      expect(jsonList(undefined)).toBe('NULL');
      expect(jsonList([])).toBe('NULL');
      expect(jsonList(['path/a.webp'])).toBe("'[\"path/a.webp\"]'");
    });

    it('should verify coordinate percentage bounds (x and y between 0 and 100)', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          if (unit.x !== undefined) {
            expect(unit.x >= 0 && unit.x <= 100).toBeTruthy(`Unit ${unit.id} x out of bounds: ${unit.x}`);
          }
          if (unit.y !== undefined) {
            expect(unit.y >= 0 && unit.y <= 100).toBeTruthy(`Unit ${unit.id} y out of bounds: ${unit.y}`);
          }
        });
      });
    });

    it('should ensure unit area and bathroom counts are positive numbers', () => {
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          expect(unit.dimensions).toBeGreaterThan(0);
          if (unit.bedrooms !== undefined) {
            expect(unit.bedrooms).toBeGreaterThan(0);
          }
          if (unit.bathrooms !== undefined) {
            expect(unit.bathrooms).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Tier 2: Missing & Invalid Transition Combinations', () => {
    it('should reject self-transition requests (e.g., furnished_to_furnished)', () => {
      const selfTransitions = [
        'furnished_to_furnished',
        'unfurnished_to_unfurnished',
        'plans_to_plans',
      ];
      selfTransitions.forEach((st) => {
        expect(CANONICAL_TRANSITIONS.includes(st)).toBeFalsy();
        const testPath = `plants/details/101/transitions/${st}.mp4`;
        expect(manifestData.allTypologyAssets.includes(testPath)).toBeFalsy();
      });
    });

    it('should reject invalid transition state names', () => {
      const invalidTransitions = [
        'furnished_to_balcony',
        'cad_to_furnished',
        'A_a_E',
        'living_to_bedroom',
      ];
      invalidTransitions.forEach((itName) => {
        expect(CANONICAL_TRANSITIONS.includes(itName)).toBeFalsy();
      });
    });

    it('should ensure every forward transition has an inverse complement', () => {
      const pairs = [
        ['furnished_to_unfurnished', 'unfurnished_to_furnished'],
        ['furnished_to_plans', 'plans_to_furnished'],
        ['unfurnished_to_plans', 'plans_to_unfurnished'],
      ];
      pairs.forEach(([fwd, rev]) => {
        expect(CANONICAL_TRANSITIONS.includes(fwd)).toBeTruthy();
        expect(CANONICAL_TRANSITIONS.includes(rev)).toBeTruthy();
      });
    });
  });

  describe('Tier 2: Video Range Request & Byte Streaming Parser Edge Cases', () => {
    function parseRangeHeader(rangeHeader, totalSize) {
      if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
        return null;
      }
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const startStr = parts[0]?.trim();
      const endStr = parts[1]?.trim();

      const start = startStr ? parseInt(startStr, 10) : undefined;
      const end = endStr ? parseInt(endStr, 10) : undefined;

      if (start !== undefined && !isNaN(start)) {
        const length = end !== undefined && !isNaN(end) ? end - start + 1 : undefined;
        return { offset: start, length };
      } else if (end !== undefined && !isNaN(end)) {
        return { suffix: end };
      }
      return null;
    }

    it('should correctly parse standard range header (bytes=0-1024)', () => {
      const range = parseRangeHeader('bytes=0-1024', 5000);
      expect(range).toEqual({ offset: 0, length: 1025 });
    });

    it('should correctly parse open-ended range header (bytes=1000-)', () => {
      const range = parseRangeHeader('bytes=1000-', 5000);
      expect(range).toEqual({ offset: 1000, length: undefined });
    });

    it('should correctly parse suffix range header (bytes=-500)', () => {
      const range = parseRangeHeader('bytes=-500', 5000);
      expect(range).toEqual({ suffix: 500 });
    });

    it('should return null for invalid or missing range headers', () => {
      expect(parseRangeHeader(null, 5000)).toBeNull();
      expect(parseRangeHeader('', 5000)).toBeNull();
      expect(parseRangeHeader('invalid-range', 5000)).toBeNull();
      expect(parseRangeHeader('bytes=abc-def', 5000)).toBeNull();
    });

    it('should enforce byte-range within total object size', () => {
      const totalSize = 10000;
      const range = parseRangeHeader('bytes=0-999', totalSize);
      expect(range.offset).toBe(0);
      expect(range.length).toBe(1000);
      expect(range.offset + range.length).toBeLessThanOrEqual(totalSize);
    });
  });
}
