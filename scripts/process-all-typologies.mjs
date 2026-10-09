import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

const SOURCE_BASE = '/Users/andrespluska/Downloads/4. TIPOLOGÍAS COMPLETO';
const DIST_BASE = path.resolve('dist_assets/plants/details');
const PUBLIC_BASE = path.resolve('public/plants/details');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function naturalSort(list) {
  return [...list].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function convertImageToWebp(srcPath, destPath, quality = 85) {
  ensureDir(path.dirname(destPath));
  await sharp(srcPath)
    .webp({ quality })
    .toFile(destPath);
}

function processVideoFaststart(srcPath, destPath) {
  ensureDir(path.dirname(destPath));
  execFileSync('ffmpeg', ['-y', '-i', srcPath, '-c', 'copy', '-movflags', '+faststart', destPath], { stdio: 'pipe' });
}

function getTransitionKey(filename) {
  if (/A_a_E/i.test(filename)) return 'furnished_to_unfurnished.mp4';
  if (/E_a_A/i.test(filename)) return 'unfurnished_to_furnished.mp4';
  if (/A_a_CAD/i.test(filename)) return 'furnished_to_plans.mp4';
  if (/CAD_a_A/i.test(filename)) return 'plans_to_furnished.mp4';
  if (/E_a_CAD/i.test(filename)) return 'unfurnished_to_plans.mp4';
  if (/CAD_a_E/i.test(filename)) return 'plans_to_unfurnished.mp4';
  return null;
}

async function processFlat(typologyFolderName, targetIds) {
  console.log(`\n▶ Processing Flat: ${typologyFolderName} -> [${targetIds.join(', ')}]`);
  const srcDir = path.join(SOURCE_BASE, typologyFolderName);
  const files = fs.readdirSync(srcDir);

  const furnishedSrc = files.find(f => /^AMOBLADO\.(png|jpe?g)$/i.test(f));
  const unfurnishedSrc = files.find(f => /^ENTREGABLE\.(png|jpe?g)$/i.test(f));
  const plansSrc = files.find(f => /^CAD\.(png|jpe?g)$/i.test(f));

  // Gallery
  const galDir = path.join(srcDir, 'GALERIA');
  let galleryFiles = [];
  if (fs.existsSync(galDir)) {
    galleryFiles = fs.readdirSync(galDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
    galleryFiles = naturalSort(galleryFiles);
  }

  // Transitions
  const transDir = path.join(srcDir, 'TRANSICIONES');
  let transFiles = [];
  if (fs.existsSync(transDir)) {
    transFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.mp4'));
  }

  for (const tid of targetIds) {
    const targetDir = path.join(DIST_BASE, tid);
    ensureDir(targetDir);

    // Base views
    if (furnishedSrc) await convertImageToWebp(path.join(srcDir, furnishedSrc), path.join(targetDir, 'furnished.webp'));
    if (unfurnishedSrc) await convertImageToWebp(path.join(srcDir, unfurnishedSrc), path.join(targetDir, 'unfurnished.webp'));
    if (plansSrc) await convertImageToWebp(path.join(srcDir, plansSrc), path.join(targetDir, 'plans.webp'));

    // Gallery
    const targetGal = path.join(targetDir, 'gallery');
    ensureDir(targetGal);
    for (let i = 0; i < galleryFiles.length; i++) {
      await convertImageToWebp(path.join(galDir, galleryFiles[i]), path.join(targetGal, `${i + 1}.webp`));
    }

    // Transitions
    const targetTrans = path.join(targetDir, 'transitions');
    ensureDir(targetTrans);
    for (const tf of transFiles) {
      const key = getTransitionKey(tf);
      if (key) {
        processVideoFaststart(path.join(transDir, tf), path.join(targetTrans, key));
      }
    }
  }
}

async function processDuplex(typologyFolderName, config) {
  // config: { level1Id, level2Id, sharedGalleryIds, filterTransL1, filterTransL2 }
  console.log(`\n▶ Processing Duplex: ${typologyFolderName} -> L1:${config.level1Id}, L2:${config.level2Id}, Gallery:[${config.sharedGalleryIds.join(', ')}]`);
  const srcDir = path.join(SOURCE_BASE, typologyFolderName);
  const files = fs.readdirSync(srcDir);

  // Level 1 files
  const furnP1 = files.find(f => /AMOBLADO[\s_-]*P1\.(png|jpe?g)$/i.test(f));
  const unfurnP1 = files.find(f => /ENTREGABLE[\s_-]*P1\.(png|jpe?g)$/i.test(f));
  const cadP1 = files.find(f => /CAD[\s_-]*P1\.(png|jpe?g)$/i.test(f));

  // Level 2 files
  const furnP2 = files.find(f => /AMOBLADO[\s_-]*P2\.(png|jpe?g)$/i.test(f));
  const unfurnP2 = files.find(f => /ENTREGABLE[\s_-]*P2\.(png|jpe?g)$/i.test(f));
  const cadP2 = files.find(f => /CAD[\s_-]*P2\.(png|jpe?g)$/i.test(f));

  // Transitions
  const transDir = path.join(srcDir, 'TRANSICIONES');
  let transFiles = [];
  if (fs.existsSync(transDir)) {
    transFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.mp4'));
  }

  // Level 1 targets (can be multiple for aliases e.g. 503.1 and 502.1)
  const l1Targets = Array.isArray(config.level1Id) ? config.level1Id : [config.level1Id];
  for (const t1 of l1Targets) {
    const targetDir = path.join(DIST_BASE, t1);
    ensureDir(targetDir);
    if (furnP1) await convertImageToWebp(path.join(srcDir, furnP1), path.join(targetDir, 'furnished.webp'));
    if (unfurnP1) await convertImageToWebp(path.join(srcDir, unfurnP1), path.join(targetDir, 'unfurnished.webp'));
    if (cadP1) await convertImageToWebp(path.join(srcDir, cadP1), path.join(targetDir, 'plans.webp'));

    const targetTrans = path.join(targetDir, 'transitions');
    ensureDir(targetTrans);
    const l1Trans = transFiles.filter(config.filterTransL1);
    for (const tf of l1Trans) {
      const key = getTransitionKey(tf);
      if (key) processVideoFaststart(path.join(transDir, tf), path.join(targetTrans, key));
    }
  }

  // Level 2 targets
  const l2Targets = Array.isArray(config.level2Id) ? config.level2Id : [config.level2Id];
  for (const t2 of l2Targets) {
    const targetDir = path.join(DIST_BASE, t2);
    ensureDir(targetDir);
    if (furnP2) await convertImageToWebp(path.join(srcDir, furnP2), path.join(targetDir, 'furnished.webp'));
    if (unfurnP2) await convertImageToWebp(path.join(srcDir, unfurnP2), path.join(targetDir, 'unfurnished.webp'));
    if (cadP2) await convertImageToWebp(path.join(srcDir, cadP2), path.join(targetDir, 'plans.webp'));

    const targetTrans = path.join(targetDir, 'transitions');
    ensureDir(targetTrans);
    const l2Trans = transFiles.filter(config.filterTransL2);
    for (const tf of l2Trans) {
      const key = getTransitionKey(tf);
      if (key) processVideoFaststart(path.join(transDir, tf), path.join(targetTrans, key));
    }
  }

  // Gallery
  const galDir = path.join(srcDir, 'GALERIA');
  let galleryFiles = [];
  if (fs.existsSync(galDir)) {
    galleryFiles = fs.readdirSync(galDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
    galleryFiles = naturalSort(galleryFiles);
  }

  for (const gid of config.sharedGalleryIds) {
    const targetGal = path.join(DIST_BASE, gid, 'gallery');
    ensureDir(targetGal);
    for (let i = 0; i < galleryFiles.length; i++) {
      await convertImageToWebp(path.join(galDir, galleryFiles[i]), path.join(targetGal, `${i + 1}.webp`));
    }
  }
}

async function run() {
  console.log('======================================================');
  console.log('   PROCESSING ALL 8 TYPOLOGIES TO DIST_ASSETS');
  console.log('======================================================');

  // 1. T1 - FLAT 101
  await processFlat('T1 - FLAT 101', ['101']);

  // 2. T2 - FLAT 102
  await processFlat('T2 - FLAT 102', ['102']);

  // 3. T3 - FLAT 201 -> x01 (and 201)
  await processFlat('T3 - FLAT 201', ['x01', '201']);

  // 4. T4 - FLAT 202 -> x02 (and 202)
  await processFlat('T4 - FLAT 202', ['x02', '202']);

  // 5. T5- DUPLEX 203
  await processDuplex('T5- DUPLEX 203', {
    level1Id: '203.1',
    level2Id: '203.2',
    sharedGalleryIds: ['203', '203.1'],
    filterTransL1: f => /^T5\s*-/i.test(f),
    filterTransL2: f => /^T5B\s*-/i.test(f),
  });

  // 6. T6 - DUPLEX 403
  await processDuplex('T6 - DUPLEX 403', {
    level1Id: '403.1',
    level2Id: '403.2',
    sharedGalleryIds: ['403', '403.1'],
    filterTransL1: f => /^T6\s*-/i.test(f),
    filterTransL2: f => /^T6B\s*-/i.test(f),
  });

  // 7. T7 - DUPLEX 501
  await processDuplex('T7 - DUPLEX 501', {
    level1Id: '501.1',
    level2Id: '501.2',
    sharedGalleryIds: ['501', '501.1'],
    filterTransL1: f => /^T7\s*-/i.test(f),
    filterTransL2: f => /^T7B\s*-/i.test(f),
  });

  // 8. T8 - DUPLEX 503 (mapped to 503 and aliased to 502 for backwards compatibility)
  await processDuplex('T8 - DUPLEX 503', {
    level1Id: ['503.1', '502.1'],
    level2Id: ['503.2', '502.2'],
    sharedGalleryIds: ['503', '503.1', '502', '502.1'],
    filterTransL1: f => /^T8\s*-/i.test(f),
    filterTransL2: f => /^T8B\s*-/i.test(f),
  });

  console.log('\n▶ Mirroring dist_assets/plants/details to public/plants/details for local dev...');
  fs.cpSync(DIST_BASE, PUBLIC_BASE, { recursive: true });

  console.log('\n✅ All assets successfully processed and normalized!');
}

run().catch(err => {
  console.error('Fatal error during processing:', err);
  process.exit(1);
});
