#!/usr/bin/env node
/**
 * scripts/process-typologies.mjs
 * 
 * Milestone 2: Normalization & Media Optimization Engine
 * 
 * Normalizes raw architectural assets staged in `raw_assets/` (or specified input path)
 * and outputs web-optimized assets under `dist_assets/plants/details/{assetId}/...`:
 * 
 * 1. Base Views:
 *    - CAD / Medidas -> plans.webp
 *    - Entregable sin amoblar -> unfurnished.webp
 *    - Amoblado -> furnished.webp
 *    Converted to WebP (quality 85) via sharp (with cwebp fallback).
 * 
 * 2. Transition Videos:
 *    - Maps raw names (A_a_E, E_a_A, A_a_CAD, CAD_a_A, E_a_CAD, CAD_a_E, etc.)
 *      to canonical web names:
 *        furnished_to_unfurnished.mp4
 *        unfurnished_to_furnished.mp4
 *        furnished_to_plans.mp4
 *        plans_to_furnished.mp4
 *        unfurnished_to_plans.mp4
 *        plans_to_unfurnished.mp4
 *    - Transcodes via ffmpeg:
 *      ffmpeg -y -i <input> -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an <output>.mp4
 * 
 * 3. Gallery Images:
 *    - Naturally sorts images (1.jpg, 2.jpg, ..., 10.jpg)
 *    - Converts to WebP (quality 85): gallery/1.webp, gallery/2.webp, ..., gallery/N.webp
 *    - Consolidates duplex galleries:
 *        501.1 and 501.2 -> dist_assets/plants/details/501/gallery/{1..12}.webp
 *        502.1 and 502.2 -> dist_assets/plants/details/502/gallery/{1..12}.webp
 * 
 * CLI Usage:
 *   node scripts/process-typologies.mjs [--input <dir>] [--output <dir>] [--concurrency <n>] [--force] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Canonical typology definitions
export const VIEW_TYPOLOGIES = [
  '101',
  '102',
  'x01',
  'x02',
  '501.1',
  '501.2',
  '502.1',
  '502.2',
];

export const GALLERY_CONFIG = {
  '101': { expectedCount: 11, sourceTypologies: ['101'] },
  '102': { expectedCount: 12, sourceTypologies: ['102'] },
  'x01': { expectedCount: 9, sourceTypologies: ['x01', '201'] },
  'x02': { expectedCount: 10, sourceTypologies: ['x02', '202'] },
  '501': { expectedCount: 15, sourceTypologies: ['501', '501.1', '501.2'], isDuplexConsolidated: true },
  '502': { expectedCount: 15, sourceTypologies: ['502', '503', '502.1', '502.2'], isDuplexConsolidated: true },
};

export const CANONICAL_TRANSITIONS = [
  'furnished_to_unfurnished',
  'unfurnished_to_furnished',
  'furnished_to_plans',
  'plans_to_furnished',
  'unfurnished_to_plans',
  'plans_to_unfurnished',
];

/**
 * Normalizes string: Unicode NFD strip accents, lowercase, trim
 */
export function normalizeStr(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Classifies an image file to a base view: 'furnished' | 'unfurnished' | 'plans' | null
 */
export function classifyBaseView(filename) {
  const norm = normalizeStr(filename);
  if (!/\.(jpe?g|png|webp|tiff?)$/i.test(filename)) return null;
  // Ignore transition videos or names with transition delimiters
  if (norm.includes('_a_') || norm.includes('_to_') || norm.includes(' a ')) return null;

  // Unfurnished checked FIRST to avoid false positive on "amoblar" in "sin amoblar"
  if (/(sin[\s_-]*amobla|entregable|desamobla|vaci[oa]|unfurnished|^e\b|_e\b)/i.test(norm)) {
    return 'unfurnished';
  }

  // Furnished checked SECOND
  if (/(amoblad[oa]|decorad[oa]|piloto|furnished|^a\b|_a\b)/i.test(norm)) {
    return 'furnished';
  }

  // Plans / CAD / Medidas
  if (/(cad|medida|plano|planta|cota|plans)/i.test(norm)) {
    return 'plans';
  }

  return null;
}

/**
 * Classifies a video filename to one of the 6 canonical transition keys, or null.
 * Returns canonical transition string without extension, e.g. 'furnished_to_unfurnished'.
 */
export function classifyTransition(filename) {
  const norm = normalizeStr(filename);
  if (!/\.(mp4|mov|m4v|webm|avi)$/i.test(filename)) return null;

  const base = norm.replace(/\.[^/.]+$/, '');
  const cleaned = base
    .replace(/^(unit_)?(\d+|x\d+)(\.\d+)?[-_\s]+/i, '')
    .replace(/^transicion(es)?[-_\s]+/i, '')
    .replace(/^video[-_\s]+/i, '')
    .trim();

  // Direct canonical acronym matches (boundary-safe for studio prefixes and suffixes)
  if (/(?:^|[^a-z0-9])a[_\s-]+a[_\s-]+e(?:[^a-z0-9]|$)/i.test(cleaned) || /^furnished_to_unfurnished$/i.test(cleaned)) {
    return 'furnished_to_unfurnished';
  }
  if (/(?:^|[^a-z0-9])e[_\s-]+a[_\s-]+a(?:[^a-z0-9]|$)/i.test(cleaned) || /^unfurnished_to_furnished$/i.test(cleaned)) {
    return 'unfurnished_to_furnished';
  }
  if (/(?:^|[^a-z0-9])a[_\s-]+a[_\s-]+cad(?:[^a-z0-9]|$)/i.test(cleaned) || /^furnished_to_plans$/i.test(cleaned)) {
    return 'furnished_to_plans';
  }
  if (/(?:^|[^a-z0-9])cad[_\s-]+a[_\s-]+a(?:[^a-z0-9]|$)/i.test(cleaned) || /^plans_to_furnished$/i.test(cleaned)) {
    return 'plans_to_furnished';
  }
  if (/(?:^|[^a-z0-9])e[_\s-]+a[_\s-]+cad(?:[^a-z0-9]|$)/i.test(cleaned) || /^unfurnished_to_plans$/i.test(cleaned)) {
    return 'unfurnished_to_plans';
  }
  if (/(?:^|[^a-z0-9])cad[_\s-]+a[_\s-]+e(?:[^a-z0-9]|$)/i.test(cleaned) || /^plans_to_unfurnished$/i.test(cleaned)) {
    return 'plans_to_unfurnished';
  }

  // Semantic token split: "<from> a <to>" or "<from> to <to>"
  function parseStateToken(token) {
    const t = token.trim().replace(/^[-_\s]+|[-_\s]+$/g, '');
    if (/^(sin[\s_-]*amobla(r|do)?|entregable|desamobla|vaci[oa]|unfurnished|e)$/i.test(t)) {
      return 'unfurnished';
    }
    if (/^(amoblad[oa]|decorad[oa]|piloto|furnished|a)$/i.test(t)) {
      return 'furnished';
    }
    if (/^(cad|medidas?|planos?|plantas?|cotas?|plans)$/i.test(t)) {
      return 'plans';
    }
    return null;
  }

  const match = cleaned.match(/^(.+?)(?:[\s_-]+(?:a|to)[\s_-]+)(.+)$/i);
  if (match) {
    const fromToken = parseStateToken(match[1]);
    const toToken = parseStateToken(match[2]);
    if (fromToken && toToken && fromToken !== toToken) {
      return `${fromToken}_to_${toToken}`;
    }
  }

  // Fallback regexes
  if (/\ba[\s_-]*a[\s_-]*e\b/i.test(cleaned)) return 'furnished_to_unfurnished';
  if (/\be[\s_-]*a[\s_-]*a\b/i.test(cleaned)) return 'unfurnished_to_furnished';
  if (/\ba[\s_-]*a[\s_-]*cad\b/i.test(cleaned)) return 'furnished_to_plans';
  if (/\bcad[\s_-]*a[\s_-]*a\b/i.test(cleaned)) return 'plans_to_furnished';
  if (/\be[\s_-]*a[\s_-]*cad\b/i.test(cleaned)) return 'unfurnished_to_plans';
  if (/\bcad[\s_-]*a[\s_-]*e\b/i.test(cleaned)) return 'plans_to_unfurnished';

  return null;
}

/**
 * Natural numerical sort for filenames (e.g. 1.jpg, 2.jpg, ..., 10.jpg)
 */
export function naturalSort(fileList) {
  return [...fileList].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Calculates SHA-256 hash of a file for exact deduplication
 */
export function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Async concurrency pool worker
 */
export async function asyncPool(limit, items, iteratorFn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

/**
 * Converts an image file to WebP quality 85 using sharp (with cwebp fallback)
 */
export async function convertImageToWebp(inputPath, outputPath, options = {}) {
  const quality = options.quality || 85;
  const force = options.force || false;

  if (fs.existsSync(outputPath) && !force) {
    const stat = fs.statSync(outputPath);
    if (stat.size > 0) {
      return { skipped: true, outputPath };
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tempOutputPath = `${outputPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.webp`;

  try {
    // Primary: sharp
    await sharp(inputPath)
      .webp({ quality, effort: 4 })
      .toFile(tempOutputPath);
    fs.renameSync(tempOutputPath, outputPath);
    return { success: true, outputPath };
  } catch (sharpError) {
    // Fallback: cwebp CLI
    try {
      await execFileAsync('cwebp', ['-q', String(quality), inputPath, '-o', tempOutputPath]);
      fs.renameSync(tempOutputPath, outputPath);
      return { success: true, outputPath, usedFallback: true };
    } catch (cwebpError) {
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
      throw new Error(`Failed to convert image to WebP (${inputPath}): ${sharpError.message} | ${cwebpError.message}`);
    }
  }
}

/**
 * Transcodes a transition video to web-compatible MP4 using ffmpeg:
 * Command: ffmpeg -y -i <input> -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an <output>.mp4
 */
export async function transcodeVideo(inputPath, outputPath, options = {}) {
  const force = options.force || false;

  if (fs.existsSync(outputPath) && !force) {
    const stat = fs.statSync(outputPath);
    if (stat.size > 0) {
      return { skipped: true, outputPath };
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tempOutputPath = `${outputPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.mp4`;

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      tempOutputPath,
    ]);

    fs.renameSync(tempOutputPath, outputPath);
    return { success: true, outputPath };
  } catch (error) {
    if (fs.existsSync(tempOutputPath)) {
      try { fs.unlinkSync(tempOutputPath); } catch (_) {}
    }
    throw new Error(`Failed to transcode video (${inputPath}): ${error.message}`);
  }
}

/**
 * Resolves the destination root directory.
 * If targetDir ends with 'plants/details', returns targetDir.
 * Otherwise, appends 'plants/details'.
 */
export function resolveDetailsDir(targetDir) {
  const resolved = path.resolve(targetDir);
  const normalized = resolved.replace(/\\/g, '/');
  if (normalized.endsWith('/plants/details')) {
    return resolved;
  }
  return path.join(resolved, 'plants', 'details');
}

/**
 * Finds all candidate files in a directory matching an image extension
 */
function findImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith('.') && /\.(jpe?g|png|webp|tiff?)$/i.test(f))
    .map(f => path.join(dir, f));
}

/**
 * Finds a subfolder matching a pattern
 */
function findSubfolder(parentDir, pattern) {
  if (!fs.existsSync(parentDir)) return null;
  const entries = fs.readdirSync(parentDir);
  for (const entry of entries) {
    const full = path.join(parentDir, entry);
    if (fs.statSync(full).isDirectory() && pattern.test(normalizeStr(entry))) {
      return full;
    }
  }
  return null;
}

/**
 * Main normalization and media optimization pipeline
 */
export async function processTypologies(options = {}) {
  const startTime = Date.now();
  const inputDir = path.resolve(options.inputDir || options.input || './raw_assets');
  const rawOutputDir = options.outputDir || options.output || './dist_assets';
  const detailsDir = resolveDetailsDir(rawOutputDir);
  const concurrency = parseInt(options.concurrency || os.cpus().length || 4, 10);
  const force = Boolean(options.force);
  const verbose = Boolean(options.verbose);

  const report = {
    inputDir,
    detailsDir,
    success: true,
    baseViews: { total: 0, converted: 0, skipped: 0, errors: [] },
    transitions: { total: 0, transcoded: 0, skipped: 0, errors: [] },
    galleries: { total: 0, converted: 0, skipped: 0, errors: [] },
    totalAssetsOutput: 0,
    errors: [],
    elapsedMs: 0,
  };

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Staged raw assets directory does not exist: ${inputDir}`);
  }

  // Ensure output details directory exists
  fs.mkdirSync(detailsDir, { recursive: true });

  const rawEntries = fs.readdirSync(inputDir);

  // Helper to locate a typology folder in inputDir
  function findTypologyDir(typologyId) {
    const directMatch = rawEntries.find(e => e.toLowerCase() === typologyId.toLowerCase());
    if (directMatch) {
      return path.join(inputDir, directMatch);
    }
    return null;
  }

  // -------------------------------------------------------------
  // Phase 1: Process Base Views (3 per typology x 8 = 24)
  // -------------------------------------------------------------
  const baseViewTasks = [];

  for (const typoId of VIEW_TYPOLOGIES) {
    const typoDir = findTypologyDir(typoId);
    if (!typoDir) {
      const err = `Missing input directory for typology ${typoId} in ${inputDir}`;
      report.baseViews.errors.push(err);
      report.errors.push(err);
      continue;
    }

    const files = fs.readdirSync(typoDir);
    const viewFiles = { furnished: null, unfurnished: null, plans: null };

    for (const f of files) {
      const fullPath = path.join(typoDir, f);
      if (fs.statSync(fullPath).isDirectory()) continue;
      const viewCategory = classifyBaseView(f);
      if (viewCategory && !viewFiles[viewCategory]) {
        viewFiles[viewCategory] = fullPath;
      }
    }

    const outTypoDir = path.join(detailsDir, typoId);

    for (const category of ['furnished', 'unfurnished', 'plans']) {
      const sourceFile = viewFiles[category];
      if (!sourceFile) {
        const err = `[${typoId}] Missing source base view for '${category}' in ${typoDir}`;
        report.baseViews.errors.push(err);
        report.errors.push(err);
        continue;
      }

      const destFile = path.join(outTypoDir, `${category}.webp`);
      baseViewTasks.push({ typoId, category, sourceFile, destFile });
    }
  }

  report.baseViews.total = baseViewTasks.length;

  await asyncPool(concurrency, baseViewTasks, async (task) => {
    try {
      const res = await convertImageToWebp(task.sourceFile, task.destFile, { quality: 85, force });
      if (res.skipped) {
        report.baseViews.skipped++;
        if (verbose) console.log(`  [base-view:skip] ${task.typoId}/${task.category}.webp`);
      } else {
        report.baseViews.converted++;
        if (verbose) console.log(`  [base-view:done] ${task.typoId}/${task.category}.webp`);
      }
    } catch (err) {
      report.baseViews.errors.push(`[${task.typoId}] ${task.category}: ${err.message}`);
      report.errors.push(`[${task.typoId}] ${task.category}: ${err.message}`);
    }
  });

  // -------------------------------------------------------------
  // Phase 2: Process Transition Videos (6 per typology x 8 = 48)
  // -------------------------------------------------------------
  const transitionTasks = [];

  for (const typoId of VIEW_TYPOLOGIES) {
    const typoDir = findTypologyDir(typoId);
    if (!typoDir) continue;

    const transSubfolder = findSubfolder(typoDir, /^(transiciones|transitions)$/i);
    if (!transSubfolder) {
      const err = `[${typoId}] Missing 'transiciones' directory in ${typoDir}`;
      report.transitions.errors.push(err);
      report.errors.push(err);
      continue;
    }

    const videoFiles = fs.readdirSync(transSubfolder)
      .filter(f => !f.startsWith('.') && /\.(mp4|mov|m4v|webm|avi)$/i.test(f));

    const matchedTransitions = new Map();

    for (const vFile of videoFiles) {
      const fullPath = path.join(transSubfolder, vFile);
      const canonicalName = classifyTransition(vFile);
      if (canonicalName && !matchedTransitions.has(canonicalName)) {
        matchedTransitions.set(canonicalName, fullPath);
      }
    }

    const outTransDir = path.join(detailsDir, typoId, 'transitions');

    for (const reqTrans of CANONICAL_TRANSITIONS) {
      const sourceVideo = matchedTransitions.get(reqTrans);
      if (!sourceVideo) {
        const err = `[${typoId}] Missing transition video for '${reqTrans}' in ${transSubfolder}`;
        report.transitions.errors.push(err);
        report.errors.push(err);
        continue;
      }

      const destVideo = path.join(outTransDir, `${reqTrans}.mp4`);
      transitionTasks.push({ typoId, reqTrans, sourceVideo, destVideo });
    }
  }

  report.transitions.total = transitionTasks.length;

  await asyncPool(concurrency, transitionTasks, async (task) => {
    try {
      const res = await transcodeVideo(task.sourceVideo, task.destVideo, { force });
      if (res.skipped) {
        report.transitions.skipped++;
        if (verbose) console.log(`  [trans:skip] ${task.typoId}/transitions/${task.reqTrans}.mp4`);
      } else {
        report.transitions.transcoded++;
        if (verbose) console.log(`  [trans:done] ${task.typoId}/transitions/${task.reqTrans}.mp4`);
      }
    } catch (err) {
      report.transitions.errors.push(`[${task.typoId}] ${task.reqTrans}: ${err.message}`);
      report.errors.push(`[${task.typoId}] ${task.reqTrans}: ${err.message}`);
    }
  });

  // -------------------------------------------------------------
  // Phase 3: Process Galleries (6 galleries: 101, 102, x01, x02, 501, 502)
  // -------------------------------------------------------------
  const galleryTasks = [];

  for (const [galleryId, conf] of Object.entries(GALLERY_CONFIG)) {
    const candidateFiles = [];
    const seenHashes = new Set();

    if (conf.isDuplexConsolidated) {
      // Duplex consolidation for 501 / 502
      // Collect candidate folders in order: root gallery (if staged directly), then level 1, then level 2
      const sourceTypoDirs = conf.sourceTypologies
        .map(tId => findTypologyDir(tId))
        .filter(Boolean);

      // Check if root shared gallery folder exists (e.g. raw_assets/501/Galeria)
      const rootSharedDir = findTypologyDir(galleryId);
      const rootGalDir = rootSharedDir ? findSubfolder(rootSharedDir, /^(galer[ií]a|gallery|fotos)$/i) : null;
      const rootGalFiles = rootGalDir ? findImageFiles(rootGalDir) : [];

      if (rootGalFiles.length > 0) {
        // If staged directly with full consolidated gallery, naturally sort
        const sortedRoot = naturalSort(rootGalFiles.map(f => path.basename(f)));
        for (const base of sortedRoot) {
          const fullPath = path.join(rootGalDir, base);
          const hash = getFileHash(fullPath);
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            candidateFiles.push(fullPath);
          }
        }
      } else {
        // Collect from sublevels in order (e.g. 501.1 then 501.2)
        for (const sDir of sourceTypoDirs) {
          const galSub = findSubfolder(sDir, /^(galer[ií]a|gallery|fotos)$/i);
          if (!galSub) continue;
          const subFiles = findImageFiles(galSub);
          const sortedSub = naturalSort(subFiles.map(f => path.basename(f)));
          for (const base of sortedSub) {
            const fullPath = path.join(galSub, base);
            const hash = getFileHash(fullPath);
            if (!seenHashes.has(hash)) {
              seenHashes.add(hash);
              candidateFiles.push(fullPath);
            }
          }
        }
      }
    } else {
      // Flats: 101, 102, x01, x02
      const typoDir = findTypologyDir(galleryId);
      if (!typoDir) {
        const err = `[gallery:${galleryId}] Missing typology directory ${typoDir}`;
        report.galleries.errors.push(err);
        report.errors.push(err);
        continue;
      }

      const galSub = findSubfolder(typoDir, /^(galer[ií]a|gallery|fotos)$/i);
      if (!galSub) {
        const err = `[gallery:${galleryId}] Missing 'Galeria' folder in ${typoDir}`;
        report.galleries.errors.push(err);
        report.errors.push(err);
        continue;
      }

      const rawImgs = findImageFiles(galSub);
      const sortedBasenames = naturalSort(rawImgs.map(f => path.basename(f)));
      for (const base of sortedBasenames) {
        candidateFiles.push(path.join(galSub, base));
      }
    }

    if (candidateFiles.length === 0) {
      const err = `[gallery:${galleryId}] Found 0 gallery images to process`;
      report.galleries.errors.push(err);
      report.errors.push(err);
      continue;
    }

    if (candidateFiles.length !== conf.expectedCount) {
      const warn = `[gallery:${galleryId}] Found ${candidateFiles.length} images (expected ${conf.expectedCount})`;
      if (verbose) console.warn(colors.yellow + warn + colors.reset);
    }

    const outGalleryDir = path.join(detailsDir, galleryId, 'gallery');

    // Build sequential tasks 1.webp .. N.webp
    candidateFiles.forEach((srcPath, idx) => {
      const seqIndex = idx + 1;
      const destPath = path.join(outGalleryDir, `${seqIndex}.webp`);
      galleryTasks.push({ galleryId, seqIndex, srcPath, destPath });
    });
  }

  report.galleries.total = galleryTasks.length;

  await asyncPool(concurrency, galleryTasks, async (task) => {
    try {
      const res = await convertImageToWebp(task.srcPath, task.destPath, { quality: 85, force });
      if (res.skipped) {
        report.galleries.skipped++;
        if (verbose) console.log(`  [gallery:skip] ${task.galleryId}/gallery/${task.seqIndex}.webp`);
      } else {
        report.galleries.converted++;
        if (verbose) console.log(`  [gallery:done] ${task.galleryId}/gallery/${task.seqIndex}.webp`);
      }
    } catch (err) {
      report.galleries.errors.push(`[${task.galleryId}/gallery/${task.seqIndex}] ${err.message}`);
      report.errors.push(`[${task.galleryId}/gallery/${task.seqIndex}] ${err.message}`);
    }
  });

  // Calculate total files output
  report.totalAssetsOutput =
    report.baseViews.converted + report.baseViews.skipped +
    report.transitions.transcoded + report.transitions.skipped +
    report.galleries.converted + report.galleries.skipped;

  report.elapsedMs = Date.now() - startTime;
  report.success = report.errors.length === 0 && report.totalAssetsOutput === 144;

  return report;
}

/**
 * Prints formatted CLI report
 */
export function printProcessReport(report) {
  console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}       NORMALIZATION & MEDIA OPTIMIZATION REPORT (M2)           ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}\n`);

  console.log(`Input Directory:  ${colors.bold}${report.inputDir}${colors.reset}`);
  console.log(`Output Directory: ${colors.bold}${report.detailsDir}${colors.reset}`);
  console.log(`Status:           ${report.success ? colors.green + '✓ SUCCESS / COMPLETED' : colors.red + '✗ FAILED / ERRORS DETECTED'}${colors.reset}`);
  console.log(`Elapsed Time:     ${(report.elapsedMs / 1000).toFixed(2)}s\n`);

  console.log(`${colors.bold}Processing Summary:${colors.reset}`);
  console.log('-----------------------------------------------------------------');
  console.log(`Category            | Target | Processed | Skipped | Errors`);
  console.log('-----------------------------------------------------------------');
  console.log(`Base Views (WebP)   | 24     | ${String(report.baseViews.converted).padEnd(9)} | ${String(report.baseViews.skipped).padEnd(7)} | ${report.baseViews.errors.length === 0 ? colors.green + '0' + colors.reset : colors.red + report.baseViews.errors.length + colors.reset}`);
  console.log(`Transitions (MP4)   | 48     | ${String(report.transitions.transcoded).padEnd(9)} | ${String(report.transitions.skipped).padEnd(7)} | ${report.transitions.errors.length === 0 ? colors.green + '0' + colors.reset : colors.red + report.transitions.errors.length + colors.reset}`);
  console.log(`Galleries (WebP)    | 72     | ${String(report.galleries.converted).padEnd(9)} | ${String(report.galleries.skipped).padEnd(7)} | ${report.galleries.errors.length === 0 ? colors.green + '0' + colors.reset : colors.red + report.galleries.errors.length + colors.reset}`);
  console.log('-----------------------------------------------------------------');
  console.log(`Total Assets        | 144    | Total Built: ${report.totalAssetsOutput}/144\n`);

  if (report.errors.length > 0) {
    console.log(`${colors.bold}${colors.red}Errors Detected (${report.errors.length}):${colors.reset}`);
    for (const err of report.errors.slice(0, 20)) {
      console.log(`  ${colors.red}✗${colors.reset} ${err}`);
    }
    if (report.errors.length > 20) {
      console.log(`  ... and ${report.errors.length - 20} more errors.`);
    }
    console.log('');
  }
}

// CLI entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const options = {
    input: './raw_assets',
    output: './dist_assets',
    concurrency: os.cpus().length || 4,
    force: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      options.input = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/process-typologies.mjs [options]

Options:
  --input, -i <dir>        Input raw_assets directory (default: ./raw_assets)
  --output, -o <dir>       Output directory (default: ./dist_assets)
  --concurrency, -c <n>    Parallel jobs limit (default: CPU cores)
  --force, -f              Overwrite existing outputs
  --verbose, -v            Print detailed progress
  --help, -h               Show this help message
`);
      process.exit(0);
    }
  }

  processTypologies(options)
    .then((report) => {
      printProcessReport(report);
      process.exit(report.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(`${colors.red}Fatal Error:${colors.reset} ${err.message}`);
      process.exit(1);
    });
}
