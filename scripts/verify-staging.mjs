#!/usr/bin/env node
/**
 * scripts/verify-staging.mjs
 * 
 * Verifies that the raw assets staged under `raw_assets/` conform to the
 * project requirements for all 8 showroom typologies.
 * 
 * Checks:
 *   - All 8 typology folders exist: 101, 102, x01, x02, 501.1, 501.2, 502.1, 502.2
 *   - All 24 base views exist and have size > 0 bytes (furnished, unfurnished, plans)
 *   - All 48 canonical transition videos exist and have size > 0 bytes (6 per typology)
 *   - All 6 galleries contain exact expected photo counts:
 *       101: 9, 102: 8, x01: 8, x02: 7, 501: 12, 502: 12
 *   - Confirms exactly 128 valid staged assets
 *   - Exits with code 0 on pass, code 1 on failure
 * 
 * Usage:
 *   node scripts/verify-staging.mjs [--dir <path>] [--json] [--verbose]
 */

import fs from 'fs';
import path from 'path';

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

export const EXPECTED_TYPOLOGIES = [
  { id: '101', name: 'Piso 1 - Flat 101', galleryCount: 11 },
  { id: '102', name: 'Piso 1 - Flat 102', galleryCount: 12 },
  { id: 'x01', name: 'Pisos 2-4 - Stack 01 (201/301/401)', galleryCount: 9 },
  { id: 'x02', name: 'Pisos 2-4 - Stack 02 (202/302/402)', galleryCount: 10 },
  { id: '501.1', name: 'Piso 5 - Dúplex 501 Nivel 1', galleryCount: 15, galleryGroup: '501' },
  { id: '501.2', name: 'Piso 6 - Dúplex 501 Nivel 2', isDuplexUpper: true, galleryGroup: '501' },
  { id: '502.1', name: 'Piso 5 - Dúplex 502 Nivel 1', galleryCount: 15, galleryGroup: '502' },
  { id: '502.2', name: 'Piso 6 - Dúplex 502 Nivel 2', isDuplexUpper: true, galleryGroup: '502' },
];

export const REQUIRED_TRANSITIONS = [
  'A_a_E',
  'E_a_A',
  'A_a_CAD',
  'CAD_a_A',
  'E_a_CAD',
  'CAD_a_E',
];

export function normalizeStr(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Classifies an image filename to a base view category: 'furnished' | 'unfurnished' | 'plans' | null
 */
export function classifyBaseView(filename) {
  const norm = normalizeStr(filename);
  if (!/\.(jpe?g|png|webp|tiff?)$/i.test(filename)) return null;
  if (norm.includes('_a_') || norm.includes('_to_') || norm.includes(' a ')) return null;

  // Unfurnished checked first to avoid false-positive match on "amoblar"
  if (/(sin[\s_-]*amobla|entregable|desamobla|vaci[oa]|unfurnished|^e\b|_e\b)/i.test(norm)) {
    return 'unfurnished';
  }

  // Furnished checked second
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
 * Classifies a video filename to one of the 6 canonical transition keys, or null
 */
export function classifyTransition(filename) {
  const norm = normalizeStr(filename);
  if (!/\.(mp4|mov|m4v|webm|avi)$/i.test(filename)) return null;

  // Boundary-safe regexes that handle studio prefixes (T{N} - {XX}_, T{N}B - {XX}_) and revision suffixes (_1)
  if (/(?:^|[^a-z0-9])a[_\s-]+a[_\s-]+e(?:[^a-z0-9]|$)/i.test(norm) || /furnished[_\s-]+to[_\s-]+unfurnished/i.test(norm)) return 'A_a_E';
  if (/(?:^|[^a-z0-9])e[_\s-]+a[_\s-]+a(?:[^a-z0-9]|$)/i.test(norm) || /unfurnished[_\s-]+to[_\s-]+furnished/i.test(norm)) return 'E_a_A';
  if (/(?:^|[^a-z0-9])a[_\s-]+a[_\s-]+cad(?:[^a-z0-9]|$)/i.test(norm) || /furnished[_\s-]+to[_\s-]+plans/i.test(norm)) return 'A_a_CAD';
  if (/(?:^|[^a-z0-9])cad[_\s-]+a[_\s-]+a(?:[^a-z0-9]|$)/i.test(norm) || /plans[_\s-]+to[_\s-]+furnished/i.test(norm)) return 'CAD_a_A';
  if (/(?:^|[^a-z0-9])e[_\s-]+a[_\s-]+cad(?:[^a-z0-9]|$)/i.test(norm) || /unfurnished[_\s-]+to[_\s-]+plans/i.test(norm)) return 'E_a_CAD';
  if (/(?:^|[^a-z0-9])cad[_\s-]+a[_\s-]+e(?:[^a-z0-9]|$)/i.test(norm) || /plans[_\s-]+to[_\s-]+unfurnished/i.test(norm)) return 'CAD_a_E';

  return null;
}

export function verifyStaging(rawAssetsDir = './raw_assets', options = {}) {
  const report = {
    valid: true,
    rawAssetsDir: path.resolve(rawAssetsDir),
    typologies: {},
    errors: [],
    warnings: [],
    stats: {
      totalFolders: 0,
      totalBaseViews: 0,
      totalTransitions: 0,
      totalGalleryImages: 0,
      totalAssetsFound: 0,
      totalAssetsExpected: 144,
    }
  };

  if (!fs.existsSync(rawAssetsDir)) {
    report.valid = false;
    report.errors.push(`Staging directory does not exist: ${rawAssetsDir}`);
    return report;
  }

  const rootEntries = fs.readdirSync(rawAssetsDir).map(e => e.normalize('NFC'));

  for (const typo of EXPECTED_TYPOLOGIES) {
    const typoReport = {
      id: typo.id,
      name: typo.name,
      folderFound: false,
      folderPath: null,
      baseViews: { furnished: null, unfurnished: null, plans: null },
      transitions: {},
      gallery: { found: false, count: 0, expected: typo.galleryCount || 0, files: [] },
      errors: [],
    };

    const folderMatch = rootEntries.find(e => e.toLowerCase() === typo.id.toLowerCase());
    if (!folderMatch) {
      report.valid = false;
      typoReport.errors.push(`Typology folder missing: ${typo.id}`);
      report.errors.push(`[${typo.id}] Directory missing`);
      report.typologies[typo.id] = typoReport;
      continue;
    }

    typoReport.folderFound = true;
    report.stats.totalFolders++;
    const typoDirPath = path.join(rawAssetsDir, folderMatch);
    typoReport.folderPath = typoDirPath;

    const files = fs.readdirSync(typoDirPath).map(f => f.normalize('NFC'));

    // 1. Verify Base Views (3 images per typology)
    const viewCategories = ['furnished', 'unfurnished', 'plans'];
    for (const file of files) {
      const fullPath = path.join(typoDirPath, file);
      if (fs.statSync(fullPath).isDirectory()) continue;
      const cat = classifyBaseView(file);
      if (cat && !typoReport.baseViews[cat]) {
        const stat = fs.statSync(fullPath);
        if (stat.size === 0) {
          typoReport.errors.push(`Base view '${cat}' is 0 bytes (${file})`);
          report.errors.push(`[${typo.id}] 0-byte base view: ${file}`);
          report.valid = false;
        } else {
          typoReport.baseViews[cat] = file;
          report.stats.totalBaseViews++;
        }
      }
    }

    for (const reqView of viewCategories) {
      if (!typoReport.baseViews[reqView]) {
        typoReport.errors.push(`Missing base view: ${reqView}`);
        report.errors.push(`[${typo.id}] Missing base view: ${reqView}`);
        report.valid = false;
      }
    }

    // 2. Verify Transitions (6 videos per typology)
    const transDirName = files.find(f => /^(transiciones|transitions)$/i.test(f));
    if (!transDirName) {
      typoReport.errors.push(`Missing 'transiciones' subdirectory`);
      report.errors.push(`[${typo.id}] Missing 'transiciones/' directory`);
      report.valid = false;
    } else {
      const transDirPath = path.join(typoDirPath, transDirName);
      const transFiles = fs.readdirSync(transDirPath).map(f => f.normalize('NFC'));

      for (const tFile of transFiles) {
        const fullPath = path.join(transDirPath, tFile);
        if (fs.statSync(fullPath).isDirectory()) continue;
        const transKey = classifyTransition(tFile);
        if (transKey && !typoReport.transitions[transKey]) {
          const stat = fs.statSync(fullPath);
          if (stat.size === 0) {
            typoReport.errors.push(`Transition '${transKey}' is 0 bytes (${tFile})`);
            report.errors.push(`[${typo.id}] 0-byte transition: ${tFile}`);
            report.valid = false;
          } else {
            typoReport.transitions[transKey] = tFile;
            report.stats.totalTransitions++;
          }
        }
      }

      for (const reqTrans of REQUIRED_TRANSITIONS) {
        if (!typoReport.transitions[reqTrans]) {
          typoReport.errors.push(`Missing transition: ${reqTrans}`);
          report.errors.push(`[${typo.id}] Missing transition: ${reqTrans}`);
          report.valid = false;
        }
      }
    }

    // 3. Verify Gallery (photos)
    if (typo.galleryCount) {
      let galDirMatch = files.find(f => /^(galer[ií]a|gallery)$/i.test(f));
      let galDirPath = null;

      if (galDirMatch) {
        galDirPath = path.join(typoDirPath, galDirMatch);
      } else if (typo.galleryGroup) {
        // Fallback: check sibling folder (e.g. raw_assets/501/Galeria)
        const siblingFolder = rootEntries.find(e => e.toLowerCase() === typo.galleryGroup.toLowerCase());
        if (siblingFolder) {
          const siblingPath = path.join(rawAssetsDir, siblingFolder);
          const sibFiles = fs.readdirSync(siblingPath).map(e => e.normalize('NFC'));
          const sibGal = sibFiles.find(f => /^(galer[ií]a|gallery)$/i.test(f));
          if (sibGal) {
            galDirPath = path.join(siblingPath, sibGal);
            galDirMatch = `${siblingFolder}/${sibGal}`;
          }
        }
      }

      if (!galDirPath) {
        typoReport.errors.push(`Missing 'Galeria' subdirectory`);
        report.errors.push(`[${typo.id}] Missing 'Galeria/' directory`);
        report.valid = false;
      } else {
        const galFiles = fs.readdirSync(galDirPath)
          .filter(f => !f.startsWith('.') && /\.(jpe?g|png|webp|tiff?)$/i.test(f));
        
        typoReport.gallery.found = true;
        typoReport.gallery.count = galFiles.length;
        typoReport.gallery.files = galFiles;

        // Verify non-zero bytes for all gallery photos
        for (const gFile of galFiles) {
          const gStat = fs.statSync(path.join(galDirPath, gFile));
          if (gStat.size === 0) {
            typoReport.errors.push(`Gallery image is 0 bytes (${gFile})`);
            report.errors.push(`[${typo.id}] 0-byte gallery image: ${gFile}`);
            report.valid = false;
          }
        }

        if (galFiles.length !== typo.galleryCount) {
          typoReport.errors.push(`Gallery count mismatch: expected ${typo.galleryCount}, found ${galFiles.length}`);
          report.errors.push(`[${typo.id}] Gallery count mismatch: expected ${typo.galleryCount}, found ${galFiles.length}`);
          report.valid = false;
        }
        report.stats.totalGalleryImages += galFiles.length;
      }
    }

    report.typologies[typo.id] = typoReport;
  }

    report.stats.totalAssetsFound = 
    report.stats.totalBaseViews + 
    report.stats.totalTransitions + 
    report.stats.totalGalleryImages;

  if (report.stats.totalAssetsFound !== 144) {
    report.valid = false;
    report.errors.push(`Total staged assets mismatch: expected 144, found ${report.stats.totalAssetsFound}`);
  }

  if (report.errors.length > 0) {
    report.valid = false;
  }

  return report;
}

export function printCliReport(report) {
  console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}       STAGING AREA VALIDATION REPORT (Milestone 1)             ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}\n`);

  console.log(`Staging Path: ${colors.bold}${report.rawAssetsDir}${colors.reset}`);
  console.log(`Status:       ${report.valid ? colors.green + '✓ VALID / PASSED' : colors.red + '✗ INVALID / FAILED'}${colors.reset}\n`);

  console.log(`${colors.bold}Typologies Overview:${colors.reset}`);
  console.log('---------------------------------------------------------------------------------');
  console.log(`ID     | Base Views (3) | Transitions (6) | Gallery Photos     | Status`);
  console.log('---------------------------------------------------------------------------------');

  for (const typo of EXPECTED_TYPOLOGIES) {
    const r = report.typologies[typo.id];
    if (!r || !r.folderFound) {
      console.log(`${typo.id.padEnd(6)} | ${colors.red}MISSING${colors.reset}        | ${colors.red}MISSING${colors.reset}         | ${colors.red}MISSING${colors.reset}            | ${colors.red}✗ FAILED${colors.reset}`);
      continue;
    }

    const bvCount = Object.values(r.baseViews).filter(Boolean).length;
    const bvStatus = bvCount === 3 ? `${colors.green}3/3 ✓${colors.reset}` : `${colors.red}${bvCount}/3 ✗${colors.reset}`;

    const trCount = Object.values(r.transitions).filter(Boolean).length;
    const trStatus = trCount === 6 ? `${colors.green}6/6 ✓${colors.reset}` : `${colors.red}${trCount}/6 ✗${colors.reset}`;

    let galStatus = `${colors.dim}N/A${colors.reset}             `;
    if (typo.galleryCount) {
      galStatus = r.gallery.count === typo.galleryCount
        ? `${colors.green}${r.gallery.count}/${typo.galleryCount} ✓${colors.reset}        `
        : `${colors.red}${r.gallery.count}/${typo.galleryCount} ✗${colors.reset}        `;
    }

    const typoPassed = r.errors.length === 0;
    const overall = typoPassed ? `${colors.green}✓ OK${colors.reset}` : `${colors.red}✗ ERRORS${colors.reset}`;

    console.log(`${typo.id.padEnd(6)} | ${bvStatus.padEnd(23)} | ${trStatus.padEnd(24)} | ${galStatus} | ${overall}`);
  }
  console.log('---------------------------------------------------------------------------------\n');

  console.log(`${colors.bold}Asset Counts Summary:${colors.reset}`);
  console.log(`  • Typology Folders: ${report.stats.totalFolders}/8`);
  console.log(`  • Base Views:       ${report.stats.totalBaseViews}/24 (Amoblado, Entregable, CAD)`);
  console.log(`  • Transitions:      ${report.stats.totalTransitions}/48 (6 per typology)`);
  console.log(`  • Gallery Photos:   ${report.stats.totalGalleryImages}/72 (101:11, 102:12, x01:9, x02:10, 501:15, 502:15)`);
  console.log(`  • Total Staged:     ${colors.bold}${report.stats.totalAssetsFound}/144 assets${colors.reset}\n`);

  if (report.errors.length > 0) {
    console.log(`${colors.bold}${colors.red}Errors (${report.errors.length}):${colors.reset}`);
    for (const err of report.errors) {
      console.log(`  ${colors.red}✗${colors.reset} ${err}`);
    }
    console.log('');
  }

  if (report.warnings.length > 0) {
    console.log(`${colors.bold}${colors.yellow}Warnings (${report.warnings.length}):${colors.reset}`);
    for (const warn of report.warnings) {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${warn}`);
    }
    console.log('');
  }
}

// CLI execution
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
let dirArg = './raw_assets';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    dirArg = args[i + 1];
    i++;
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-staging.mjs')) {
  const result = verifyStaging(dirArg);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printCliReport(result);
  }
  process.exit(result.valid ? 0 : 1);
}
