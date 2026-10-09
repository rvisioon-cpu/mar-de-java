#!/usr/bin/env node
/**
 * scripts/stage-typologies.mjs
 * 
 * Unpacks, maps, and stages raw Google Drive assets into the canonical `raw_assets/`
 * directory structure for the Mar de Java showroom.
 * 
 * Capabilities:
 *   - Extracts ZIP downloads via native `/usr/bin/ditto -x -k` or Python zipfile fallback
 *   - Normalizes Unicode with NFC to resolve macOS APFS decomposed strings
 *   - Maps all 8 typologies (101, 102, x01, x02, 501.1, 501.2, 502.1, 502.2) and duplex galleries (501, 502)
 *   - Cleans up OS metadata (__MACOSX, .DS_Store, Thumbs.db, ._*)
 *   - CLI options:
 *       --watch [--watch-dir <path>]  Watch ~/Downloads for incoming Drive download
 *       --archive <path>              Unpack and stage a specific ZIP archive
 *       --source <folder>             Stage from an existing directory
 *       --target <folder>             Staging destination (default: ./raw_assets)
 *       --verify                      Run verify-staging.mjs after staging completes
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { verifyStaging, printCliReport } from './verify-staging.mjs';

export const TYPOLOGY_FOLDER_RULES = [
  {
    match: /^(?:t1\b|.*flat[\s_-]*101)/i,
    targetId: '101',
    type: 'flat',
  },
  {
    match: /^(?:t2\b|.*flat[\s_-]*102)/i,
    targetId: '102',
    type: 'flat',
  },
  {
    match: /^(?:t3\b|.*(?:flat[\s_-]*201|x01|201[-_ ]*301[-_ ]*401))/i,
    targetId: 'x01',
    type: 'flat',
  },
  {
    match: /^(?:t4\b|.*(?:flat[\s_-]*202|x02|202[-_ ]*302[-_ ]*402))/i,
    targetId: 'x02',
    type: 'flat',
  },
  {
    match: /^(?:t7\b|.*duplex[\s_-]*501)/i,
    targetId: '501',
    type: 'duplex',
    lowerId: '501.1',
    upperId: '501.2',
    lowerPrefix: 'T7',
    upperPrefix: 'T7B',
  },
  {
    match: /^(?:t8\b|.*duplex[\s_-]*(?:502|503))/i,
    targetId: '502',
    type: 'duplex',
    lowerId: '502.1',
    upperId: '502.2',
    lowerPrefix: 'T8',
    upperPrefix: 'T8B',
  },
];

export const IGNORED_FOLDERS = [
  /^(?:t5[\s_-]*|.*duplex[\s_-]*203)/i,
  /^(?:t6[\s_-]*|.*duplex[\s_-]*403)/i,
  /^detalles$/i,
  /^plantas[\s_-]*sin[\s_-]*ia$/i,
];

// Typology regex mappings (evaluated in order for pre-split or legacy folders)
export const TYPOLOGY_MAPPINGS = [
  // Duplex sublevels evaluated BEFORE shared duplex root
  {
    targetId: '501.1',
    pattern: /^(?:.*[-_\s])?(501[\.\-_]1|501.*piso[\s_-]*5|501.*nivel[\s_-]*1|501.*inferior)(\b|\s|\(|$)/i,
  },
  {
    targetId: '501.2',
    pattern: /^(?:.*[-_\s])?(501[\.\-_]2|501.*piso[\s_-]*6|501.*nivel[\s_-]*2|501.*superior|601)(\b|\s|\(|$)/i,
  },
  {
    targetId: '502.1',
    pattern: /^(?:.*[-_\s])?(502[\.\-_]1|502.*piso[\s_-]*5|502.*nivel[\s_-]*1|502.*inferior)(\b|\s|\(|$)/i,
  },
  {
    targetId: '502.2',
    pattern: /^(?:.*[-_\s])?(502[\.\-_]2|502.*piso[\s_-]*6|502.*nivel[\s_-]*2|502.*superior|602)(\b|\s|\(|$)/i,
  },
  // Shared duplex galleries
  {
    targetId: '501',
    pattern: /^(?:.*[-_\s])?(501|duplex[\s_-]*501)(\b|\s|\(|$)/i,
  },
  {
    targetId: '502',
    pattern: /^(?:.*[-_\s])?(502|duplex[\s_-]*502)(\b|\s|\(|$)/i,
  },
  // Flats
  {
    targetId: '101',
    pattern: /^(?:.*[-_\s])?(101|flat[\s_-]*101|piso[\s_-]*1.*101)(\b|\s|\(|$)/i,
  },
  {
    targetId: '102',
    pattern: /^(?:.*[-_\s])?(102|flat[\s_-]*102|piso[\s_-]*1.*102)(\b|\s|\(|$)/i,
  },
  {
    targetId: 'x01',
    pattern: /^(?:.*[-_\s])?(x01|201[-_ ]*301[-_ ]*401|piso[\s_-]*[234].*01|piso[\s_-]*2[- ]*4.*01|tipic[ao][\s._-]*0?1)(\b|\s|\(|$)/i,
  },
  {
    targetId: 'x02',
    pattern: /^(?:.*[-_\s])?(x02|202[-_ ]*302[-_402]|piso[\s_-]*[234].*02|piso[\s_-]*2[- ]*4.*02|tipic[ao][\s._-]*0?2)(\b|\s|\(|$)/i,
  },
];

/**
 * Normalizes Unicode to NFC and cleans strings
 */
export function normalizeNFC(str) {
  if (!str) return '';
  return str.normalize('NFC').trim();
}

/**
 * Recursively removes OS metadata, thumbnails, and temp files
 */
export function cleanJunk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    try {
      const stat = fs.lstatSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === '__MACOSX' || entry === '.git') {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          cleanJunk(fullPath);
        }
      } else {
        if (entry === '.DS_Store' || entry === 'Thumbs.db' || entry === 'desktop.ini' || entry.startsWith('._')) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch {
      // Ignore transient access errors
    }
  }
}

/**
 * Extracts a ZIP file using ditto on macOS with python fallback
 */
export function extractZip(zipPath, destDir) {
  const resolvedZip = path.resolve(zipPath);
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`[extract] Unpacking '${resolvedZip}' to '${destDir}'...`);

  let extracted = false;
  // Primary: /usr/bin/ditto (native macOS, preserves UTF-8 without CP437 corruption)
  try {
    execSync(`ditto -x -k "${resolvedZip}" "${destDir}"`, { stdio: 'inherit' });
    extracted = true;
  } catch (err) {
    console.warn(`[extract] ditto failed (${err.message}), falling back to python3 zipfile...`);
  }

  if (!extracted) {
    try {
      execSync(`python3 -m zipfile -e "${resolvedZip}" "${destDir}"`, { stdio: 'inherit' });
      extracted = true;
    } catch (err2) {
      console.error(`[extract] python3 zipfile failed: ${err2.message}`);
      throw new Error(`Failed to extract ZIP archive: ${resolvedZip}`);
    }
  }

  cleanJunk(destDir);
  return destDir;
}

/**
 * Locates the directory containing typology folders within an extracted tree
 */
export function findTypologyRoot(startDir) {
  let current = startDir;

  while (true) {
    const entries = fs.readdirSync(current).map(e => normalizeNFC(e));
    const subdirs = entries.filter(e => {
      const p = path.join(current, e);
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    });

    // Check if current directory directly contains typology matches
    const hasTypologyMatch = subdirs.some(d => {
      return TYPOLOGY_FOLDER_RULES.some(m => m.match.test(d)) ||
             TYPOLOGY_MAPPINGS.some(m => m.pattern.test(d));
    });

    if (hasTypologyMatch) {
      return current;
    }

    // If there is only one subdirectory (e.g. wrapper folder "5. TIPOLOGÍAS COMPLETO"), descend
    if (subdirs.length === 1) {
      current = path.join(current, subdirs[0]);
      continue;
    }

    // Look for a subdir that has "tipolog" in its name
    const tipologDir = subdirs.find(d => /tipolog/i.test(d));
    if (tipologDir) {
      current = path.join(current, tipologDir);
      continue;
    }

    break;
  }

  return current;
}

/**
 * Normalizes subdirectories inside a staged typology (Galeria, transiciones)
 */
function normalizeTypologySubdirs(destPath) {
  if (!fs.existsSync(destPath)) return;
  const entries = fs.readdirSync(destPath).map(e => normalizeNFC(e));

  for (const entry of entries) {
    const fullPath = path.join(destPath, entry);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    // Normalize gallery folder
    if (/^galer[ií]a$/i.test(entry) && entry !== 'Galeria') {
      const targetGal = path.join(destPath, 'Galeria');
      if (!fs.existsSync(targetGal)) {
        fs.renameSync(fullPath, targetGal);
      }
    }

    // Normalize transitions folder
    if (/^transicion(es)?$/i.test(entry) && entry !== 'transiciones') {
      const targetTrans = path.join(destPath, 'transiciones');
      if (!fs.existsSync(targetTrans)) {
        fs.renameSync(fullPath, targetTrans);
      }
    }
  }
}

/**
 * Stages typologies from a source directory into the canonical raw_assets target
 */
export function stageFromSourceDir(sourceDir, targetDir = './raw_assets') {
  const resolvedSource = path.resolve(sourceDir);
  const resolvedTarget = path.resolve(targetDir);

  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source directory does not exist: ${resolvedSource}`);
  }

  const root = findTypologyRoot(resolvedSource);
  console.log(`[stage] Scanning for typologies in '${root}'...`);
  fs.mkdirSync(resolvedTarget, { recursive: true });

  const entries = fs.readdirSync(root).map(e => normalizeNFC(e));
  const subdirs = entries.filter(e => {
    const p = path.join(root, e);
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  });

  const stagedIds = new Set();

  for (const dirName of subdirs) {
    if (IGNORED_FOLDERS.some(ign => ign.test(dirName))) {
      console.log(`  [skip] Ignored non-showroom directory: '${dirName}'`);
      continue;
    }

    const srcPath = path.join(root, dirName);
    const rule = TYPOLOGY_FOLDER_RULES.find(r => r.match.test(dirName));

    if (rule) {
      if (rule.type === 'flat') {
        const destPath = path.join(resolvedTarget, rule.targetId);
        console.log(`  [map] '${dirName}' -> '${rule.targetId}'`);
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.mkdirSync(destPath, { recursive: true });

        // Copy root files (base views)
        for (const item of fs.readdirSync(srcPath)) {
          const itemPath = path.join(srcPath, item);
          if (fs.statSync(itemPath).isFile() && !item.startsWith('.')) {
            fs.copyFileSync(itemPath, path.join(destPath, item));
          }
        }

        // Copy transitions
        const transDir = fs.readdirSync(srcPath).find(d => /^(transicion(es)?|transitions)$/i.test(d));
        if (transDir) {
          const srcTrans = path.join(srcPath, transDir);
          const destTrans = path.join(destPath, 'transiciones');
          fs.mkdirSync(destTrans, { recursive: true });
          for (const tFile of fs.readdirSync(srcTrans)) {
            const tPath = path.join(srcTrans, tFile);
            if (fs.statSync(tPath).isFile() && !tFile.startsWith('.')) {
              fs.copyFileSync(tPath, path.join(destTrans, tFile));
            }
          }
        }

        // Copy gallery (exclude subdirectories like DETALLES)
        const galDir = fs.readdirSync(srcPath).find(d => /^(galer[ií]a|gallery)$/i.test(d));
        if (galDir) {
          const srcGal = path.join(srcPath, galDir);
          const destGal = path.join(destPath, 'Galeria');
          fs.mkdirSync(destGal, { recursive: true });
          for (const gFile of fs.readdirSync(srcGal)) {
            const gPath = path.join(srcGal, gFile);
            if (fs.statSync(gPath).isFile() && !gFile.startsWith('.')) {
              fs.copyFileSync(gPath, path.join(destGal, gFile));
            }
          }
        }

        normalizeTypologySubdirs(destPath);
        stagedIds.add(rule.targetId);
      } else if (rule.type === 'duplex') {
        console.log(`  [unpack] Duplex '${dirName}' -> '${rule.lowerId}' (Level 1) & '${rule.upperId}' (Level 2)`);

        const lowerDest = path.join(resolvedTarget, rule.lowerId);
        const upperDest = path.join(resolvedTarget, rule.upperId);

        if (fs.existsSync(lowerDest)) fs.rmSync(lowerDest, { recursive: true, force: true });
        if (fs.existsSync(upperDest)) fs.rmSync(upperDest, { recursive: true, force: true });

        fs.mkdirSync(lowerDest, { recursive: true });
        fs.mkdirSync(upperDest, { recursive: true });
        fs.mkdirSync(path.join(lowerDest, 'transiciones'), { recursive: true });
        fs.mkdirSync(path.join(upperDest, 'transiciones'), { recursive: true });

        // Base views mapping
        for (const item of fs.readdirSync(srcPath)) {
          const itemPath = path.join(srcPath, item);
          if (!fs.statSync(itemPath).isFile() || item.startsWith('.')) continue;

          const ext = path.extname(item);
          const norm = normalizeNFC(item).toLowerCase();

          if (norm.includes('p1') || norm.includes('nivel 1') || norm.includes('nivel1')) {
            let targetName = item;
            if (/amoblado/i.test(norm)) targetName = `furnished${ext}`;
            else if (/entregable/i.test(norm)) targetName = `unfurnished${ext}`;
            else if (/cad/i.test(norm)) targetName = `plans${ext}`;
            fs.copyFileSync(itemPath, path.join(lowerDest, targetName));
          } else if (norm.includes('p2') || norm.includes('nivel 2') || norm.includes('nivel2')) {
            let targetName = item;
            if (/amoblado/i.test(norm)) targetName = `furnished${ext}`;
            else if (/entregable/i.test(norm)) targetName = `unfurnished${ext}`;
            else if (/cad/i.test(norm)) targetName = `plans${ext}`;
            fs.copyFileSync(itemPath, path.join(upperDest, targetName));
          }
        }

        // Transitions unpacking
        const transDir = fs.readdirSync(srcPath).find(d => /^(transicion(es)?|transitions)$/i.test(d));
        if (transDir) {
          const srcTrans = path.join(srcPath, transDir);
          for (const tFile of fs.readdirSync(srcTrans)) {
            const tPath = path.join(srcTrans, tFile);
            if (!fs.statSync(tPath).isFile() || tFile.startsWith('.')) continue;

            const norm = normalizeNFC(tFile).toLowerCase();
            const upperPrefix = rule.upperPrefix.toLowerCase();
            const lowerPrefix = rule.lowerPrefix.toLowerCase();

            if (norm.startsWith(upperPrefix) || norm.includes(upperPrefix)) {
              fs.copyFileSync(tPath, path.join(upperDest, 'transiciones', tFile));
            } else if (norm.startsWith(lowerPrefix) || norm.includes(lowerPrefix)) {
              fs.copyFileSync(tPath, path.join(lowerDest, 'transiciones', tFile));
            }
          }
        }

        // Gallery
        const galDir = fs.readdirSync(srcPath).find(d => /^(galer[ií]a|gallery)$/i.test(d));
        if (galDir) {
          const srcGal = path.join(srcPath, galDir);
          const galImages = fs.readdirSync(srcGal).filter(f => !f.startsWith('.') && fs.statSync(path.join(srcGal, f)).isFile());
          if (galImages.length > 0) {
            const sharedGalDest = path.join(resolvedTarget, rule.targetId, 'Galeria');
            const lowerGalDest = path.join(lowerDest, 'Galeria');
            fs.mkdirSync(sharedGalDest, { recursive: true });
            fs.mkdirSync(lowerGalDest, { recursive: true });
            for (const img of galImages) {
              fs.copyFileSync(path.join(srcGal, img), path.join(sharedGalDest, img));
              fs.copyFileSync(path.join(srcGal, img), path.join(lowerGalDest, img));
            }
          }
        }

        normalizeTypologySubdirs(lowerDest);
        normalizeTypologySubdirs(upperDest);
        stagedIds.add(rule.lowerId);
        stagedIds.add(rule.upperId);
        stagedIds.add(rule.targetId);
      }
      continue;
    }

    // Direct / legacy fallback
    const matched = TYPOLOGY_MAPPINGS.find(m => m.pattern.test(dirName));
    if (matched) {
      const destPath = path.join(resolvedTarget, matched.targetId);
      console.log(`  [map:direct] '${dirName}' -> '${matched.targetId}'`);
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      fs.cpSync(srcPath, destPath, { recursive: true });
      normalizeTypologySubdirs(destPath);
      stagedIds.add(matched.targetId);
    } else {
      console.log(`  [skip] Non-typology directory: '${dirName}'`);
    }
  }

  // Cross-reference and mirror shared duplex galleries
  syncDuplexGalleries(resolvedTarget);

  cleanJunk(resolvedTarget);
  console.log(`[stage] Staging complete. Staged ${stagedIds.size} typology directories in '${resolvedTarget}'.`);
  return stagedIds;
}

/**
 * Ensures shared duplex galleries are accessible in both canonical locations:
 * raw_assets/501/Galeria, raw_assets/501.1/Galeria, raw_assets/502/Galeria, raw_assets/502.1/Galeria
 */
export function syncDuplexGalleries(targetDir) {
  const duplexPairs = [
    { shared: '501', lower: '501.1' },
    { shared: '502', lower: '502.1' },
  ];

  for (const pair of duplexPairs) {
    const sharedGal = path.join(targetDir, pair.shared, 'Galeria');
    const lowerGal = path.join(targetDir, pair.lower, 'Galeria');

    if (fs.existsSync(sharedGal) && !fs.existsSync(lowerGal)) {
      console.log(`  [duplex] Mirroring ${pair.shared}/Galeria to ${pair.lower}/Galeria...`);
      fs.mkdirSync(path.dirname(lowerGal), { recursive: true });
      fs.cpSync(sharedGal, lowerGal, { recursive: true });
    }

    if (fs.existsSync(lowerGal) && !fs.existsSync(sharedGal)) {
      console.log(`  [duplex] Mirroring ${pair.lower}/Galeria to ${pair.shared}/Galeria...`);
      fs.mkdirSync(path.dirname(sharedGal), { recursive: true });
      fs.cpSync(lowerGal, sharedGal, { recursive: true });
    }
  }

  // Penthouse cross-mirroring: 501 mirrors 502 if 501 gallery is empty
  const gal502 = path.join(targetDir, '502', 'Galeria');
  const gal501 = path.join(targetDir, '501', 'Galeria');
  const gal501_1 = path.join(targetDir, '501.1', 'Galeria');

  const has502 = fs.existsSync(gal502) && fs.readdirSync(gal502).filter(f => !f.startsWith('.')).length > 0;
  const has501 = fs.existsSync(gal501) && fs.readdirSync(gal501).filter(f => !f.startsWith('.')).length > 0;

  if (has502 && !has501) {
    console.log(`  [duplex] Mirroring 502/Galeria to 501/Galeria and 501.1/Galeria...`);
    fs.mkdirSync(gal501, { recursive: true });
    fs.cpSync(gal502, gal501, { recursive: true });
    fs.mkdirSync(gal501_1, { recursive: true });
    fs.cpSync(gal502, gal501_1, { recursive: true });
  }
}

/**
 * Stages typologies from an archive file
 */
export function stageFromArchive(archivePath, targetDir = './raw_assets') {
  const resolvedArchive = path.resolve(archivePath);
  if (!fs.existsSync(resolvedArchive)) {
    throw new Error(`Archive not found: ${resolvedArchive}`);
  }

  const tmpExtract = path.join(
    path.dirname(path.resolve(targetDir)),
    `.tmp_drive_extract_${Date.now()}`
  );

  try {
    extractZip(resolvedArchive, tmpExtract);
    const stagedIds = stageFromSourceDir(tmpExtract, targetDir);
    return stagedIds;
  } finally {
    if (fs.existsSync(tmpExtract)) {
      fs.rmSync(tmpExtract, { recursive: true, force: true });
    }
  }
}

/**
 * Helper to check if a file is still growing in size (download in progress)
 */
function isFileWritingComplete(filePath, delayMs = 1500) {
  try {
    const initialSize = fs.statSync(filePath).size;
    if (initialSize === 0) return false;
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, delayMs);
    const newSize = fs.statSync(filePath).size;
    return initialSize === newSize;
  } catch {
    return false;
  }
}

/**
 * Checks if a directory or ZIP file contains typology entries
 */
export function containsTypologies(dirOrZip) {
  try {
    const stat = fs.statSync(dirOrZip);
    if (stat.isDirectory()) {
      const root = findTypologyRoot(dirOrZip);
      const entries = fs.readdirSync(root).map(e => normalizeNFC(e));
      return entries.some(e =>
        TYPOLOGY_FOLDER_RULES.some(m => m.match.test(e)) ||
        TYPOLOGY_MAPPINGS.some(m => m.pattern.test(e))
      );
    } else if (stat.isFile() && /\.zip$/i.test(dirOrZip)) {
      const listing = execSync(`unzip -l "${dirOrZip}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      return TYPOLOGY_FOLDER_RULES.some(m => m.match.test(listing)) ||
             TYPOLOGY_MAPPINGS.some(m => m.pattern.test(listing));
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Scans a directory for relevant Google Drive downloads
 */
export function findDriveArtifacts(watchDir) {
  if (!fs.existsSync(watchDir)) return { archives: [], folders: [], inProgress: [] };
  const entries = fs.readdirSync(watchDir).map(e => normalizeNFC(e));

  const archives = [];
  const folders = [];
  const inProgress = [];

  for (const entry of entries) {
    const full = path.join(watchDir, entry);
    try {
      const stat = fs.statSync(full);
      if (entry.endsWith('.crdownload') || entry.endsWith('.download')) {
        inProgress.push(full);
      } else if (stat.isFile() && /\.zip$/i.test(entry)) {
        if (/^(drive-download|5[\.\s_-]*tipolog|tipolog)/i.test(entry) && containsTypologies(full)) {
          archives.push(full);
        }
      } else if (stat.isDirectory()) {
        if (/^(drive-download|5[\.\s_-]*tipolog|tipolog)/i.test(entry) && containsTypologies(full)) {
          folders.push(full);
        }
      }
    } catch {
      // Ignore
    }
  }

  return { archives, folders, inProgress };
}

/**
 * Watcher implementation
 */
export async function watchDownloads(watchDir, targetDir = './raw_assets', options = {}) {
  const resolvedWatchDir = path.resolve(watchDir);
  console.log(`[watch] Monitoring '${resolvedWatchDir}' for Google Drive downloads...`);
  console.log(`[watch] Tip: Open https://drive.google.com/drive/folders/1PMqkbDpYT7jhI0k27aMT24CdW_qmBNuL in Chrome and download folder '5. TIPOLOGÍAS COMPLETO'.`);

  const pollIntervalMs = options.pollIntervalMs || 2000;
  let staged = false;

  while (!staged) {
    const { archives, folders, inProgress } = findDriveArtifacts(resolvedWatchDir);

    if (inProgress.length > 0) {
      console.log(`[watch] Download in progress detected (${inProgress.map(p => path.basename(p)).join(', ')})... waiting for completion.`);
    } else if (archives.length > 0) {
      // Pick the newest archive
      archives.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      const chosen = archives[0];

      console.log(`[watch] Found completed archive: '${chosen}'. Verifying write status...`);
      if (isFileWritingComplete(chosen)) {
        console.log(`[watch] Starting staging from archive '${chosen}'...`);
        stageFromArchive(chosen, targetDir);
        staged = true;
        break;
      } else {
        console.log(`[watch] File is still being written to, will retry...`);
      }
    } else if (folders.length > 0) {
      folders.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      const chosen = folders[0];
      console.log(`[watch] Found extracted folder: '${chosen}'. Starting staging...`);
      stageFromSourceDir(chosen, targetDir);
      staged = true;
      break;
    }

    // Sleep before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.log(`[watch] Staging finished successfully.`);
  if (options.verify) {
    console.log(`[watch] Running verification pass...`);
    const report = verifyStaging(targetDir);
    printCliReport(report);
    if (!report.valid) {
      throw new Error('Staging verification failed.');
    }
  }
}

// CLI argument parser
function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    watchDir: path.join(os.homedir(), 'Downloads'),
    archive: null,
    source: null,
    target: './raw_assets',
    verify: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--watch-dir' && args[i + 1]) {
      options.watchDir = args[++i];
    } else if (arg === '--archive' && args[i + 1]) {
      options.archive = args[++i];
    } else if (arg === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    } else if (arg === '--verify') {
      options.verify = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/stage-typologies.mjs [options]

Options:
  --watch               Watch ~/Downloads for incoming Google Drive downloads
  --watch-dir <path>    Specify custom watch directory (default: ~/Downloads)
  --archive <path>      Unpack and stage a specific ZIP archive file
  --source <folder>     Stage from an existing directory
  --target <folder>     Destination folder (default: ./raw_assets)
  --verify              Run staging verification after staging (or stand-alone)
  -h, --help            Show this help message
      `);
      process.exit(0);
    }
  }

  return options;
}

// Execution
async function main() {
  const options = parseCliArgs();

  if (options.watch) {
    await watchDownloads(options.watchDir, options.target, { verify: options.verify });
    return;
  }

  if (options.archive) {
    stageFromArchive(options.archive, options.target);
    if (options.verify) {
      const report = verifyStaging(options.target);
      printCliReport(report);
      process.exit(report.valid ? 0 : 1);
    }
    return;
  }

  if (options.source) {
    stageFromSourceDir(options.source, options.target);
    if (options.verify) {
      const report = verifyStaging(options.target);
      printCliReport(report);
      process.exit(report.valid ? 0 : 1);
    }
    return;
  }

  if (options.verify) {
    const report = verifyStaging(options.target);
    printCliReport(report);
    process.exit(report.valid ? 0 : 1);
  }

  // If no specific mode provided, scan default Downloads folder or prompt
  const artifacts = findDriveArtifacts(options.watchDir);
  if (artifacts.archives.length > 0 || artifacts.folders.length > 0) {
    console.log(`[stage] Found Drive artifacts in '${options.watchDir}'. Processing automatically...`);
    await watchDownloads(options.watchDir, options.target, { verify: true, pollIntervalMs: 500 });
  } else {
    console.log(`No active archive or source specified and no Drive artifacts currently found in '${options.watchDir}'.`);
    console.log(`Run with '--watch' to wait for the download, or '--archive <path>', or '--source <folder>'.`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('stage-typologies.mjs')) {
  main().catch(err => {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  });
}
