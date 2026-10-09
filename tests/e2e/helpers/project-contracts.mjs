/**
 * Project Contracts & Schema Definitions for E2E Testing
 * Source of Truth: ORIGINAL_REQUEST.md & PROJECT.md
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../../../');

// 8 Canonical Typology View Folders
export const CANONICAL_VIEW_FOLDERS = [
  '101',
  '102',
  'x01',
  'x02',
  '501.1',
  '501.2',
  '502.1',
  '502.2',
];

// 3 Base Views per folder
export const CANONICAL_BASE_VIEWS = [
  'furnished.webp',
  'unfurnished.webp',
  'plans.webp',
];

// 6 Bidirectional Transitions per folder
export const CANONICAL_TRANSITIONS = [
  'furnished_to_unfurnished',
  'unfurnished_to_furnished',
  'furnished_to_plans',
  'plans_to_furnished',
  'unfurnished_to_plans',
  'plans_to_unfurnished',
];

// Gallery folders and expected counts
export const CANONICAL_GALLERIES = {
  '101': 11,
  '102': 12,
  'x01': 9,
  'x02': 10,
  '501': 15,
  '502': 15,
};

// Expected counts
export const EXPECTED_BASE_VIEWS_COUNT = CANONICAL_VIEW_FOLDERS.length * CANONICAL_BASE_VIEWS.length; // 8 * 3 = 24
export const EXPECTED_TRANSITIONS_COUNT = CANONICAL_VIEW_FOLDERS.length * CANONICAL_TRANSITIONS.length; // 8 * 6 = 48
export const EXPECTED_GALLERY_IMAGES_COUNT = Object.values(CANONICAL_GALLERIES).reduce((a, b) => a + b, 0); // 72
export const EXPECTED_TOTAL_TYPOLOGY_ASSETS = EXPECTED_BASE_VIEWS_COUNT + EXPECTED_TRANSITIONS_COUNT + EXPECTED_GALLERY_IMAGES_COUNT; // 144

// MIME Types mapping
export const MIME_TYPES = {
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// All 12 Showroom Units defined in floorsData
export const EXPECTED_UNITS = [
  { id: '101', floorId: '1', assetId: '101', galleryFolder: '101', galleryCount: 11, isDuplex: false },
  { id: '102', floorId: '1', assetId: '102', galleryFolder: '102', galleryCount: 12, isDuplex: false },
  { id: '201', floorId: '2', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: '202', floorId: '2', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: '301', floorId: '3', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: '302', floorId: '3', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: '401', floorId: '4', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: '402', floorId: '4', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: '501', floorId: '5', assetId: '501.1', galleryFolder: '501', galleryCount: 15, isDuplex: true, level: 1 },
  { id: '502', floorId: '5', assetId: '502.1', galleryFolder: '502', galleryCount: 15, isDuplex: true, level: 1 },
  { id: '601', floorId: '6', identifier: '501', assetId: '501.2', galleryFolder: '501', galleryCount: 15, isDuplex: true, level: 2 },
  { id: '602', floorId: '6', identifier: '502', assetId: '502.2', galleryFolder: '502', galleryCount: 15, isDuplex: true, level: 2 },
];

export const EXPECTED_FLOORS = ['S2', 'S1', '1', '2', '3', '4', '5', '6'];

// Local SQLite database path in .wrangler
export const D1_SQLITE_PATH = path.join(
  PROJECT_ROOT,
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/2372b877e3064b86dba73676d15d97dad1d0710b02f6271ac28bada4e8f3731d.sqlite'
);

// Staging & Dist paths
export const RAW_ASSETS_DIR = path.join(PROJECT_ROOT, 'raw_assets');
export const DIST_ASSETS_DIR = path.join(PROJECT_ROOT, 'dist_assets/plants/details');

/**
 * Utility to parse floorsData from src/data/floors.ts
 */
export function loadFloorsData() {
  const filePath = path.join(PROJECT_ROOT, 'src/data/floors.ts');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  let floorsDataStr = fileContent.substring(
    fileContent.indexOf('export const floorsData: Floor[] = [') + 'export const floorsData: Floor[] = '.length
  );
  floorsDataStr = floorsDataStr.substring(0, floorsDataStr.lastIndexOf('];') + 1);

  // Substitute asset variables for evaluation
  floorsDataStr = floorsDataStr.replace(/floorS2/g, '"/plants/floor_s2.webp"');
  floorsDataStr = floorsDataStr.replace(/floorS1/g, '"/plants/floor_s1.webp"');
  floorsDataStr = floorsDataStr.replace(/floor1/g, '"/plants/floor_1.webp"');
  floorsDataStr = floorsDataStr.replace(/floor2/g, '"/plants/floor_2.webp"');
  floorsDataStr = floorsDataStr.replace(/floor3/g, '"/plants/floor_3.webp"');
  floorsDataStr = floorsDataStr.replace(/floor4/g, '"/plants/floor_4.webp"');
  floorsDataStr = floorsDataStr.replace(/floor5/g, '"/plants/floor_5.webp"');
  floorsDataStr = floorsDataStr.replace(/floor6/g, '"/plants/floor_6.webp"');

  // eslint-disable-next-line no-eval
  return eval(floorsDataStr);
}

/**
 * Utility to parse assetManifest from src/data/asset-manifest.ts
 */
export function loadAssetManifest() {
  const filePath = path.join(PROJECT_ROOT, 'src/data/asset-manifest.ts');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const unitViewFolders = CANONICAL_VIEW_FOLDERS;
  const unitTransitions = CANONICAL_TRANSITIONS;
  const unitGalleries = CANONICAL_GALLERIES;

  const unitViewAssets = unitViewFolders.flatMap(folder => [
    `plants/details/${folder}/furnished.webp`,
    `plants/details/${folder}/unfurnished.webp`,
    `plants/details/${folder}/plans.webp`,
    ...unitTransitions.map(name => `plants/details/${folder}/transitions/${name}.mp4`),
  ]);

  const unitGalleryAssets = Object.entries(unitGalleries).flatMap(([folder, count]) =>
    Array.from({ length: count }, (_, i) => `plants/details/${folder}/gallery/${i + 1}.webp`)
  );

  return {
    rawContent: fileContent,
    unitViewAssets,
    unitGalleryAssets,
    allTypologyAssets: [...unitViewAssets, ...unitGalleryAssets],
  };
}

/**
 * Implementation of getAssetUrl matching src/utils/assets.ts
 */
export function getAssetUrl(assetPath) {
  if (!assetPath) return '';
  if (assetPath.startsWith('/api/') || assetPath.startsWith('data:') || assetPath.startsWith('blob:')) return assetPath;

  let cleanPath = assetPath;
  const devR2Domain = 'https://pub-44777f1e13a04cbaa9c6d275228617c2.r2.dev';
  if (cleanPath.startsWith(devR2Domain)) {
    cleanPath = cleanPath.slice(devR2Domain.length);
  }

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2PublicUrl && cleanPath.startsWith(r2PublicUrl)) {
    cleanPath = cleanPath.slice(r2PublicUrl.length);
  }

  if (cleanPath.startsWith('http')) return cleanPath;

  const cleanPathNoSlash = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

  if (cleanPathNoSlash.startsWith('ICONOS/')) {
    return `/${cleanPathNoSlash}`;
  }

  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  const isVideo = videoExtensions.some(ext => cleanPathNoSlash.toLowerCase().endsWith(ext));
  if (isVideo) {
    return `/api/r2/${cleanPathNoSlash}`;
  }

  const ASSET_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  return ASSET_BASE_URL ? `${ASSET_BASE_URL}/${cleanPathNoSlash}` : cleanPathNoSlash;
}

/**
 * Implementation of getCanvasImageUrl matching src/utils/assets.ts
 */
export function getCanvasImageUrl(assetPath) {
  if (!assetPath) return '';
  if (assetPath.startsWith('data:') || assetPath.startsWith('blob:') || assetPath.startsWith('/api/')) {
    return assetPath;
  }
  let key = assetPath;
  const devR2Domain = 'https://pub-44777f1e13a04cbaa9c6d275228617c2.r2.dev';
  if (key.startsWith(devR2Domain)) key = key.slice(devR2Domain.length);
  const ASSET_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  if (ASSET_BASE_URL && key.startsWith(ASSET_BASE_URL)) key = key.slice(ASSET_BASE_URL.length);
  if (key.startsWith('http')) return key;
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `/api/r2/${cleanKey}`;
}

/**
 * Implementation of getEntryFloorId matching src/data/floors.ts
 */
export function getEntryFloorId(floorsList) {
  const list = floorsList && floorsList.length > 0 ? floorsList : loadFloorsData();
  const apartments = list.filter(f => f.id.toLowerCase() !== 'pb' && !f.id.toLowerCase().startsWith('s'));
  const pool = apartments.length > 0 ? apartments : list;
  if (pool.length === 0) return '1';
  return [...pool].sort((a, b) => b.level - a.level)[0].id;
}
