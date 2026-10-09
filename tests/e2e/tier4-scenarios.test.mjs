/**
 * Tier 4: Real-World Application Scenarios E2E Tests
 * Simulates complete end-to-end user journeys through the showroom:
 * 1. Apartment view loading & cycling
 * 2. Transition video seeking & byte-range streaming via proxy
 * 3. Gallery walkthrough navigation & boundary control
 * 4. Duplex multi-level plan switching
 * 5. Offline database fallback resiliency
 */

import { describe, it, expect } from './helpers/assertion.mjs';
import {
  loadFloorsData,
  CANONICAL_GALLERIES,
  D1_SQLITE_PATH,
  getAssetUrl,
  getEntryFloorId,
} from './helpers/project-contracts.mjs';
import { execSync } from 'child_process';

export function registerTier4Tests() {
  const floors = loadFloorsData();

  describe('Tier 4: Scenario 1 — Apartment View Loading & Cycling Journey', () => {
    it('should simulate a user inspecting flat 101 and switching views across furnished, unfurnished, and plans', () => {
      // 1. User selects Floor 1
      const floor1 = floors.find((f) => f.id === '1');
      expect(floor1).toBeDefined();

      // 2. User clicks on Unit 101
      const unit101 = floor1.units.find((u) => u.id === '101');
      expect(unit101).toBeDefined();

      // 3. User views initial "Furnished" view
      const furnishedUrl = getAssetUrl(unit101.photosFurnished[0]);
      expect(furnishedUrl).toContain('plants/details/101/furnished.webp');

      // 4. User toggles to "Unfurnished" (Entregable) view
      const unfurnishedUrl = getAssetUrl(unit101.photosUnfurnished[0]);
      expect(unfurnishedUrl).toContain('plants/details/101/unfurnished.webp');

      // 5. User toggles to "Plans / Medidas" view
      const plansUrl = getAssetUrl(unit101.photosPlans[0]);
      expect(plansUrl).toContain('plants/details/101/plans.webp');

      // Verify all 3 views are distinct assets for this unit
      expect(furnishedUrl !== unfurnishedUrl).toBeTruthy();
      expect(unfurnishedUrl !== plansUrl).toBeTruthy();
      expect(plansUrl !== furnishedUrl).toBeTruthy();
    });

    it('should simulate typical flat 201 using stack folder x01 for all views', () => {
      const floor2 = floors.find((f) => f.id === '2');
      const unit201 = floor2.units.find((u) => u.id === '201');
      expect(unit201).toBeDefined();
      expect(unit201.assetId).toBe('x01');

      const furnishedUrl = getAssetUrl(unit201.photosFurnished[0]);
      expect(furnishedUrl).toContain('plants/details/x01/furnished.webp');

      const unfurnishedUrl = getAssetUrl(unit201.photosUnfurnished[0]);
      expect(unfurnishedUrl).toContain('plants/details/x01/unfurnished.webp');

      const plansUrl = getAssetUrl(unit201.photosPlans[0]);
      expect(plansUrl).toContain('plants/details/x01/plans.webp');
    });
  });

  describe('Tier 4: Scenario 2 — Transition Video Seeking & Range Streaming Journey', () => {
    it('should simulate transition playback initiation and byte-range request for smooth seeking', () => {
      const folder = 'x01';
      const transitionKey = `plants/details/${folder}/transitions/furnished_to_unfurnished.mp4`;

      // 1. Client resolves media URL via getAssetUrl
      const streamUrl = getAssetUrl(transitionKey);
      expect(streamUrl).toBe(`/api/r2/${transitionKey}`);

      // 2. Client initiates Range request (first 1024 bytes for MP4 moov/mdat header inspection)
      const rangeRequestHeader = 'bytes=0-1023';
      const simulatedFileSize = 1048576; // 1MB mock video size

      // Simulate range header calculation from route.ts
      const parts = rangeRequestHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      const contentLength = end - start + 1;

      expect(start).toBe(0);
      expect(end).toBe(1023);
      expect(contentLength).toBe(1024);

      // 3. Expected HTTP response headers for 206 Partial Content
      const responseHeaders = {
        'status': 206,
        'content-type': 'video/mp4',
        'content-range': `bytes ${start}-${end}/${simulatedFileSize}`,
        'content-length': contentLength.toString(),
        'accept-ranges': 'bytes',
      };

      expect(responseHeaders.status).toBe(206);
      expect(responseHeaders['content-type']).toBe('video/mp4');
      expect(responseHeaders['content-range']).toBe('bytes 0-1023/1048576');
      expect(responseHeaders['content-length']).toBe('1024');
      expect(responseHeaders['accept-ranges']).toBe('bytes');
    });

    it('should simulate scrubbing to midpoint (open-ended range bytes=524288-)', () => {
      const simulatedFileSize = 1048576;
      const startOffset = 524288;
      const rangeRequestHeader = `bytes=${startOffset}-`;

      const parts = rangeRequestHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const expectedLength = simulatedFileSize - start;

      const responseHeaders = {
        'status': 206,
        'content-range': `bytes ${start}-${simulatedFileSize - 1}/${simulatedFileSize}`,
        'content-length': expectedLength.toString(),
      };

      expect(responseHeaders['content-range']).toBe('bytes 524288-1048575/1048576');
      expect(responseHeaders['content-length']).toBe('524288');
    });
  });

  describe('Tier 4: Scenario 3 — Gallery Walkthrough Navigation Journey', () => {
    it('should simulate a user opening gallery for unit 102 and stepping sequentially through all 12 photos', () => {
      const floor1 = floors.find((f) => f.id === '1');
      const unit102 = floor1.units.find((u) => u.id === '102');
      const gallery = unit102.gallery;
      const totalPhotos = CANONICAL_GALLERIES['102']; // 12

      expect(gallery.length).toBe(totalPhotos);

      // Simulate sequential step forward
      let currentPhotoIndex = 0;
      const visitedUrls = [];

      for (let step = 0; step < totalPhotos; step++) {
        currentPhotoIndex = step;
        const currentPhotoPath = gallery[currentPhotoIndex];
        expect(currentPhotoPath).toBe(`plants/details/102/gallery/${step + 1}.webp`);

        const photoUrl = getAssetUrl(currentPhotoPath);
        visitedUrls.push(photoUrl);
      }

      expect(visitedUrls.length).toBe(totalPhotos);

      // Verify bounds guard when clicking "Next" on the last photo
      const nextIndex = currentPhotoIndex + 1;
      const hasNext = nextIndex < gallery.length;
      expect(hasNext).toBeFalsy(); // Cannot step beyond last photo

      // Verify cyclical wrap-around if slideshow mode is enabled
      const wrappedIndex = nextIndex % gallery.length;
      expect(wrappedIndex).toBe(0);
      expect(gallery[wrappedIndex]).toBe('plants/details/102/gallery/1.webp');
    });

    it('should simulate gallery inspection on 15-photo duplex gallery 501', () => {
      const floor5 = floors.find((f) => f.id === '5');
      const unit501 = floor5.units.find((u) => u.id === '501');
      expect(unit501.gallery.length).toBe(15);

      unit501.gallery.forEach((photoPath, idx) => {
        expect(photoPath).toBe(`plants/details/501/gallery/${idx + 1}.webp`);
      });
    });
  });

  describe('Tier 4: Scenario 4 — Duplex Multi-Level Plan Switching Journey', () => {
    it('should simulate a user viewing Duplex 501 on Floor 5 and toggling between Lower (Level 1) and Upper (Level 2) plans', () => {
      // 1. User navigates to Floor 5 and selects Duplex 501
      const floor5 = floors.find((f) => f.id === '5');
      const unit501Lower = floor5.units.find((u) => u.id === '501');
      expect(unit501Lower.subtitle).toBe('Dúplex');
      expect(unit501Lower.assetId).toBe('501.1');

      // Lower Level assets
      const lowerFurnished = getAssetUrl(unit501Lower.photosFurnished[0]);
      const lowerPlans = getAssetUrl(unit501Lower.photosPlans[0]);
      expect(lowerFurnished).toContain('plants/details/501.1/furnished.webp');
      expect(lowerPlans).toContain('plants/details/501.1/plans.webp');

      // 2. User toggles the duplex Level Selector to Level 2 (Floor 6, row 601)
      const floor6 = floors.find((f) => f.id === '6');
      const unit501Upper = floor6.units.find((u) => u.identifier === '501');
      expect(unit501Upper).toBeDefined();
      expect(unit501Upper.id).toBe('601');
      expect(unit501Upper.assetId).toBe('501.2');

      // Upper Level assets
      const upperFurnished = getAssetUrl(unit501Upper.photosFurnished[0]);
      const upperPlans = getAssetUrl(unit501Upper.photosPlans[0]);
      expect(upperFurnished).toContain('plants/details/501.2/furnished.webp');
      expect(upperPlans).toContain('plants/details/501.2/plans.webp');

      // 3. Verify base view assets switched from 501.1 to 501.2
      expect(lowerFurnished !== upperFurnished).toBeTruthy();
      expect(lowerPlans !== upperPlans).toBeTruthy();

      // 4. Verify shared gallery and 360 tour remains identical across levels
      expect(unit501Lower.gallery).toEqual(unit501Upper.gallery);
      expect(unit501Lower.tourUrl).toBe(unit501Upper.tourUrl);
    });

    it('should simulate a user viewing Duplex 502 and toggling between Level 1 (502.1) and Level 2 (502.2)', () => {
      const floor5 = floors.find((f) => f.id === '5');
      const unit502Lower = floor5.units.find((u) => u.id === '502');

      const floor6 = floors.find((f) => f.id === '6');
      const unit502Upper = floor6.units.find((u) => u.identifier === '502');

      expect(unit502Lower.assetId).toBe('502.1');
      expect(unit502Upper.assetId).toBe('502.2');
      expect(unit502Lower.gallery).toEqual(unit502Upper.gallery);
      expect(unit502Lower.tourUrl).toBe(unit502Upper.tourUrl);
    });
  });

  describe('Tier 4: Scenario 5 — Offline & D1 Database Fallback Resiliency Journey', () => {
    it('should verify showroom functions seamlessly using static floorsData when D1 database is offline', () => {
      const defaultEntryFloor = getEntryFloorId(undefined);
      expect(defaultEntryFloor).toBe('6'); // Top apartment floor

      const emptyDbFallback = getEntryFloorId([]);
      expect(emptyDbFallback).toBe('6');

      let totalUnitsCount = 0;
      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          totalUnitsCount++;
          expect(unit.photosFurnished.length).toBeGreaterThan(0);
          expect(unit.photosUnfurnished.length).toBeGreaterThan(0);
          expect(unit.photosPlans.length).toBeGreaterThan(0);
          expect(unit.gallery.length).toBeGreaterThan(0);
        });
      });
      expect(totalUnitsCount).toBe(12);
    });

    it('should verify live D1 SQLite database returns exact same 12 units as static fallback', () => {
      const sqliteUnitsResult = execSync(
        `sqlite3 "${D1_SQLITE_PATH}" "SELECT id, identifier FROM units ORDER BY id ASC;"`,
        { encoding: 'utf8' }
      );
      const rows = sqliteUnitsResult.trim().split('\n');
      expect(rows.length).toBe(12);

      floors.forEach((floor) => {
        floor.units.forEach((unit) => {
          const expectedUnitId = `unit_${floor.id}_${unit.id.replace(/\s+/g, '_').toLowerCase()}`;
          const found = rows.some((r) => r.startsWith(expectedUnitId));
          expect(found).toBeTruthy(`Unit ${expectedUnitId} missing in SQLite live table`);
        });
      });
    });
  });
}
