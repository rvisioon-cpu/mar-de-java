import fs from 'fs';
import path from 'path';

const R2_PUBLIC_URL = "https://pub-44777f1e13a04cbaa9c6d275228617c2.r2.dev";

const unitAssetMap = {
  'unit_1_101': '102',
  'unit_1_102': '101',
  'unit_2_201': 'x01',
  'unit_3_301': 'x01',
  'unit_4_401': 'x01',
  'unit_5_501': 'x01',
  'unit_6_601': 'x01',
  'unit_7_701': 'x01',
  'unit_2_202': 'x02',
  'unit_3_302': 'x02',
  'unit_4_402': 'x02',
  'unit_5_502': 'x02',
  'unit_6_602': 'x02',
  'unit_7_702': 'x02',
  'unit_8_802': 'x02',
  'unit_8_801': '801',
  'unit_9_901': '901',
  'unit_9_terraza': '902'
};

// 1. Read manifest to find assets
const manifestContent = fs.readFileSync('./src/data/asset-manifest.ts', 'utf8');
const assetManifest = [];
const matches = manifestContent.matchAll(/['"]([^'"]+)['"]/g);
for (const match of matches) {
  if (match[1].startsWith('plants/') || match[1].startsWith('amenities/')) {
    assetManifest.push(match[1]);
  }
}

const getStaticViewUrl = (assetId, type) => {
  const extensions = ['jpg', 'jpeg', 'png'];
  for (const ext of extensions) {
    const relativePath = `plants/details/${assetId}/${type}.${ext}`;
    if (assetManifest.includes(relativePath)) {
      return `${R2_PUBLIC_URL}/${relativePath}`;
    }
  }
  return null;
};

const getGalleryUrls = (assetId) => {
  const specificImages = assetManifest
    .filter(p => p.includes(`plants/details/${assetId}/gallery/`))
    .map(p => `${R2_PUBLIC_URL}/${p}`);
  
  if (specificImages.length === 0) {
    const fallbackUrls = [];
    for (let i = 1; i <= 10; i++) {
      const jpgPath = `plants/details/${assetId}/gallery/${i}.jpg`;
      const pngPath = `plants/details/${assetId}/gallery/${i}.png`;
      if (assetManifest.includes(jpgPath)) {
        fallbackUrls.push(`${R2_PUBLIC_URL}/${jpgPath}`);
      } else if (assetManifest.includes(pngPath)) {
        fallbackUrls.push(`${R2_PUBLIC_URL}/${pngPath}`);
      }
    }
    return fallbackUrls;
  }
  return specificImages;
};

const updateSeedFile = (filePath) => {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`File does not exist: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  const updatedLines = [];

  for (let line of lines) {
    if (line.startsWith("INSERT INTO units ")) {
      // Find the unit ID in the VALUES clause
      const idMatch = line.match(/VALUES \('([^']+)'/);
      if (idMatch && unitAssetMap[idMatch[1]]) {
        const unitId = idMatch[1];
        const assetId = unitAssetMap[unitId];

        const furnished = getStaticViewUrl(assetId, 'furnished');
        const unfurnished = getStaticViewUrl(assetId, 'unfurnished');
        const plans = getStaticViewUrl(assetId, 'plans');
        const gallery = getGalleryUrls(assetId);

        const furnishedVal = furnished ? `["${furnished}"]` : `[]`;
        const unfurnishedVal = unfurnished ? `["${unfurnished}"]` : `[]`;
        const plansVal = plans ? `["${plans}"]` : `[]`;
        const galleryVal = JSON.stringify(gallery);

        // Modify the columns list
        line = line.replace(
          "INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url)",
          "INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)"
        );

        // Modify the values list (ends with );)
        const closeIndex = line.lastIndexOf(");");
        if (closeIndex !== -1) {
          const mainPart = line.substring(0, closeIndex);
          line = `${mainPart}, '${furnishedVal.replace(/'/g, "''")}', '${unfurnishedVal.replace(/'/g, "''")}', '${plansVal.replace(/'/g, "''")}', '${galleryVal.replace(/'/g, "''")}');`;
        }
      } else if (line.includes("INSERT INTO units") && line.includes("unit_pb_")) {
        // Storage units: insert empty arrays for photos and gallery
        line = line.replace(
          "INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url)",
          "INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)"
        );
        const closeIndex = line.lastIndexOf(");");
        if (closeIndex !== -1) {
          const mainPart = line.substring(0, closeIndex);
          line = `${mainPart}, '[]', '[]', '[]', '[]');`;
        }
      }
    }
    updatedLines.push(line);
  }

  fs.writeFileSync(absolutePath, updatedLines.join('\n'), 'utf8');
  console.log(`Successfully updated seed file: ${filePath}`);
};

updateSeedFile('./seed.sql');
updateSeedFile('./src/lib/db/seed.sql');
