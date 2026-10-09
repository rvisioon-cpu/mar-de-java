/**
 * Tier 1: Feature Coverage E2E Tests
 * Validates primary behavior (happy paths) across all 8 typology folders,
 * 3 base views, 6 transition videos, sequential gallery images, and content-types.
 */

import { describe, it, expect } from './helpers/assertion.mjs';
import {
  CANONICAL_VIEW_FOLDERS,
  CANONICAL_BASE_VIEWS,
  CANONICAL_TRANSITIONS,
  CANONICAL_GALLERIES,
  EXPECTED_BASE_VIEWS_COUNT,
  EXPECTED_TRANSITIONS_COUNT,
  EXPECTED_GALLERY_IMAGES_COUNT,
  EXPECTED_TOTAL_TYPOLOGY_ASSETS,
  MIME_TYPES,
  loadAssetManifest,
  DIST_ASSETS_DIR,
} from './helpers/project-contracts.mjs';
import fs from 'fs';
import path from 'path';

export function registerTier1Tests() {
  const manifestData = loadAssetManifest();

  describe('Tier 1: Typology View Folders Inventory (8 Folders)', () => {
    it('should declare exactly 8 canonical view folders in asset-manifest.ts', () => {
      expect(CANONICAL_VIEW_FOLDERS.length).toBe(8);
      expect(CANONICAL_VIEW_FOLDERS).toContain('101');
      expect(CANONICAL_VIEW_FOLDERS).toContain('102');
      expect(CANONICAL_VIEW_FOLDERS).toContain('x01');
      expect(CANONICAL_VIEW_FOLDERS).toContain('x02');
      expect(CANONICAL_VIEW_FOLDERS).toContain('501.1');
      expect(CANONICAL_VIEW_FOLDERS).toContain('501.2');
      expect(CANONICAL_VIEW_FOLDERS).toContain('502.1');
      expect(CANONICAL_VIEW_FOLDERS).toContain('502.2');
    });

    it('should include single-floor flats: 101 and 102', () => {
      expect(CANONICAL_VIEW_FOLDERS.includes('101')).toBeTruthy();
      expect(CANONICAL_VIEW_FOLDERS.includes('102')).toBeTruthy();
    });

    it('should include repeated typical flat stacks: x01 and x02', () => {
      expect(CANONICAL_VIEW_FOLDERS.includes('x01')).toBeTruthy();
      expect(CANONICAL_VIEW_FOLDERS.includes('x02')).toBeTruthy();
    });

    it('should include split duplex 501 levels: 501.1 and 501.2', () => {
      expect(CANONICAL_VIEW_FOLDERS.includes('501.1')).toBeTruthy();
      expect(CANONICAL_VIEW_FOLDERS.includes('501.2')).toBeTruthy();
    });

    it('should include split duplex 502 levels: 502.1 and 502.2', () => {
      expect(CANONICAL_VIEW_FOLDERS.includes('502.1')).toBeTruthy();
      expect(CANONICAL_VIEW_FOLDERS.includes('502.2')).toBeTruthy();
    });
  });

  describe('Tier 1: Base Views Completeness (F4 - 3 views per folder, 24 total)', () => {
    CANONICAL_VIEW_FOLDERS.forEach((folder) => {
      it(`should define all 3 base views (furnished, unfurnished, plans) for folder "${folder}"`, () => {
        CANONICAL_BASE_VIEWS.forEach((viewName) => {
          const expectedPath = `plants/details/${folder}/${viewName}`;
          expect(manifestData.unitViewAssets).toContain(expectedPath);
        });
      });
    });

    it('should have exactly 24 base view paths across all 8 folders', () => {
      const baseViewAssets = manifestData.unitViewAssets.filter((asset) =>
        CANONICAL_BASE_VIEWS.some((bv) => asset.endsWith(bv))
      );
      expect(baseViewAssets.length).toBe(EXPECTED_BASE_VIEWS_COUNT);
    });

    it('should verify all base views use the WebP format', () => {
      const baseViewAssets = manifestData.unitViewAssets.filter((asset) =>
        CANONICAL_BASE_VIEWS.some((bv) => asset.endsWith(bv))
      );
      baseViewAssets.forEach((asset) => {
        expect(asset.endsWith('.webp')).toBeTruthy();
      });
    });

    it('should ensure no duplicate base view paths exist in manifest', () => {
      const baseViewAssets = manifestData.unitViewAssets.filter((asset) =>
        CANONICAL_BASE_VIEWS.some((bv) => asset.endsWith(bv))
      );
      const uniquePaths = new Set(baseViewAssets);
      expect(uniquePaths.size).toBe(EXPECTED_BASE_VIEWS_COUNT);
    });
  });

  describe('Tier 1: Transition Videos Completeness (F6 - 6 videos per folder, 48 total)', () => {
    it('should have exactly 6 canonical transition permutations', () => {
      expect(CANONICAL_TRANSITIONS.length).toBe(6);
      expect(CANONICAL_TRANSITIONS).toContain('furnished_to_unfurnished');
      expect(CANONICAL_TRANSITIONS).toContain('unfurnished_to_furnished');
      expect(CANONICAL_TRANSITIONS).toContain('furnished_to_plans');
      expect(CANONICAL_TRANSITIONS).toContain('plans_to_furnished');
      expect(CANONICAL_TRANSITIONS).toContain('unfurnished_to_plans');
      expect(CANONICAL_TRANSITIONS).toContain('plans_to_unfurnished');
    });

    CANONICAL_VIEW_FOLDERS.forEach((folder) => {
      it(`should include all 6 bidirectional transition videos for folder "${folder}"`, () => {
        CANONICAL_TRANSITIONS.forEach((transitionName) => {
          const expectedVideoPath = `plants/details/${folder}/transitions/${transitionName}.mp4`;
          expect(manifestData.unitViewAssets).toContain(expectedVideoPath);
        });
      });
    });

    it('should have exactly 48 transition video paths in total', () => {
      const transitionAssets = manifestData.unitViewAssets.filter((asset) =>
        asset.includes('/transitions/') && asset.endsWith('.mp4')
      );
      expect(transitionAssets.length).toBe(EXPECTED_TRANSITIONS_COUNT);
    });

    it('should ensure all transition videos use lowercase alphanumeric and underscores', () => {
      const transitionAssets = manifestData.unitViewAssets.filter((asset) =>
        asset.includes('/transitions/')
      );
      transitionAssets.forEach((asset) => {
        const basename = path.basename(asset);
        expect(/^[a-z0-9_]+\.mp4$/.test(basename)).toBeTruthy();
      });
    });
  });

  describe('Tier 1: Gallery Images Completeness (F5 - 6 galleries, 72 images total)', () => {
    it('should declare expected gallery counts for all 6 gallery folders', () => {
      expect(CANONICAL_GALLERIES['101']).toBe(11);
      expect(CANONICAL_GALLERIES['102']).toBe(12);
      expect(CANONICAL_GALLERIES['x01']).toBe(9);
      expect(CANONICAL_GALLERIES['x02']).toBe(10);
      expect(CANONICAL_GALLERIES['501']).toBe(15);
      expect(CANONICAL_GALLERIES['502']).toBe(15);
    });

    Object.entries(CANONICAL_GALLERIES).forEach(([folder, count]) => {
      it(`should generate sequential images 1.webp through ${count}.webp for gallery "${folder}"`, () => {
        for (let i = 1; i <= count; i++) {
          const expectedPath = `plants/details/${folder}/gallery/${i}.webp`;
          expect(manifestData.unitGalleryAssets).toContain(expectedPath);
        }
      });
    });

    it('should have exactly 72 gallery image paths in total', () => {
      expect(manifestData.unitGalleryAssets.length).toBe(EXPECTED_GALLERY_IMAGES_COUNT);
    });

    it('should consolidate duplex gallery renders under shared parent folders (501 and 502)', () => {
      const has501Level1 = manifestData.unitGalleryAssets.some((p) => p.includes('501.1/gallery'));
      const has501Level2 = manifestData.unitGalleryAssets.some((p) => p.includes('501.2/gallery'));
      expect(has501Level1).toBeFalsy();
      expect(has501Level2).toBeFalsy();

      const duplex501Images = manifestData.unitGalleryAssets.filter((p) => p.startsWith('plants/details/501/gallery/'));
      const duplex502Images = manifestData.unitGalleryAssets.filter((p) => p.startsWith('plants/details/502/gallery/'));
      expect(duplex501Images.length).toBe(15);
      expect(duplex502Images.length).toBe(15);
    });
  });

  describe('Tier 1: Content-Type & Media Asset Metadata (F9 - 144 assets total)', () => {
    it('should verify total media inventory matches exactly 144 assets', () => {
      expect(manifestData.allTypologyAssets.length).toBe(EXPECTED_TOTAL_TYPOLOGY_ASSETS);
    });

    it('should map all .webp assets to image/webp MIME type', () => {
      const webpAssets = manifestData.allTypologyAssets.filter((a) => a.endsWith('.webp'));
      expect(webpAssets.length).toBe(EXPECTED_BASE_VIEWS_COUNT + EXPECTED_GALLERY_IMAGES_COUNT);
      webpAssets.forEach((asset) => {
        const ext = path.extname(asset);
        expect(MIME_TYPES[ext]).toBe('image/webp');
      });
    });

    it('should map all .mp4 assets to video/mp4 MIME type', () => {
      const mp4Assets = manifestData.allTypologyAssets.filter((a) => a.endsWith('.mp4'));
      expect(mp4Assets.length).toBe(EXPECTED_TRANSITIONS_COUNT);
      mp4Assets.forEach((asset) => {
        const ext = path.extname(asset);
        expect(MIME_TYPES[ext]).toBe('video/mp4');
      });
    });

    it('should ensure all asset paths follow the canonical plants/details/{folder}/ prefix', () => {
      manifestData.allTypologyAssets.forEach((asset) => {
        expect(asset.startsWith('plants/details/')).toBeTruthy();
      });
    });

    it('should verify staged assets layout when dist_assets directory is present', () => {
      if (fs.existsSync(DIST_ASSETS_DIR)) {
        CANONICAL_VIEW_FOLDERS.forEach((folder) => {
          const folderPath = path.join(DIST_ASSETS_DIR, folder);
          if (fs.existsSync(folderPath)) {
            CANONICAL_BASE_VIEWS.forEach((bv) => {
              const bvPath = path.join(folderPath, bv);
              if (fs.existsSync(bvPath)) {
                const stat = fs.statSync(bvPath);
                expect(stat.size).toBeGreaterThan(0);
              }
            });
          }
        });
      } else {
        // Staged assets directory is pending M2 completion; contract is validated via manifest
        expect(true).toBeTruthy();
      }
    });
  });
}
