import fs from 'fs';

const fileContent = fs.readFileSync('./src/data/floors.ts', 'utf8');

// Extract the floorsData array text
let floorsDataStr = fileContent.substring(fileContent.indexOf('export const floorsData: Floor[] = [') + 'export const floorsData: Floor[] = '.length);
floorsDataStr = floorsDataStr.substring(0, floorsDataStr.lastIndexOf('];') + 1);

// Replace asset usages with actual paths
floorsDataStr = floorsDataStr.replace(/floorS2/g, '"/plants/floor_s2.webp"');
floorsDataStr = floorsDataStr.replace(/floorS1/g, '"/plants/floor_s1.webp"');
floorsDataStr = floorsDataStr.replace(/floor1/g, '"/plants/floor_1.webp"');
floorsDataStr = floorsDataStr.replace(/floor2/g, '"/plants/floor_2.webp"');
floorsDataStr = floorsDataStr.replace(/floor3/g, '"/plants/floor_3.webp"');
floorsDataStr = floorsDataStr.replace(/floor4/g, '"/plants/floor_4.webp"');
floorsDataStr = floorsDataStr.replace(/floor5/g, '"/plants/floor_5.webp"');
floorsDataStr = floorsDataStr.replace(/floor6/g, '"/plants/floor_6.webp"');
floorsDataStr = floorsDataStr.replace(/floor7/g, '"/plants/floor_7.png"');
floorsDataStr = floorsDataStr.replace(/floorDuplex1/g, '"/plants/floor_duplex_1.png"');
floorsDataStr = floorsDataStr.replace(/floorDuplex2/g, '"/plants/floor_duplex_2.png"');

const floorsData = eval(floorsDataStr);

// The only 360 tour with no unit behind it. Its id has to stay 'building-main'
// because the showroom's "Recorrido General" button deep-links to
// /recorridos?tourId=building-main.
const BUILDING_TOUR = {
  id: 'building-main',
  title: 'Recorrido General',
  subtitle: 'Áreas comunes',
  thumbnail: 'building/photos/1.1.webp',
  target: 'https://kuula.co/share/collection/7TdKK?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&gyro=0&initload=0&thumbs=1&inst=es',
};

// page_views references units, so any recorded visit to a unit page blocks the
// wipe below with a foreign key error. The rows themselves are worth keeping
// (path, device, date), so only the link to the unit is cleared.
let sql = 'DELETE FROM tours;\n'
  + 'UPDATE page_views SET unit_id = NULL WHERE unit_id IS NOT NULL;\n'
  + 'DELETE FROM units;\n'
  + 'DELETE FROM floors;\n';

for (const floor of floorsData) {
  const floorId = `floor_${floor.id}`;
  let type = 'Piso';
  if (floor.id.toLowerCase() === 'pb') {
    type = 'Planta Baja';
  } else if (floor.id.toLowerCase().startsWith('pb') || floor.id.toLowerCase().startsWith('s')) {
    type = 'Sótano';
  }
  sql += `INSERT INTO floors (id, name, level, type, image_path) VALUES ('${floorId}', '${floor.name}', ${floor.level}, '${type}', '${floor.floorPlanImage}');\n`;

  for (const unit of floor.units) {
    const unitId = `unit_${floor.id}_${unit.id.replace(/\s+/g, '_').toLowerCase()}`;
    const coordinates = unit.x !== undefined && unit.y !== undefined ? JSON.stringify({ x: unit.x, y: unit.y, path: unit.path }) : (unit.path ? JSON.stringify({ path: unit.path }) : 'NULL');
    let state = unit.status === 'available' ? 'AVAILABLE' : (unit.status === 'sold' ? 'SOLD' : 'RESERVED');
    if (unit.id === 'Terraza') {
      state = 'COMMON_AREA';
    }
    // A duplex spans two floors, which is what makes the unit page offer the
    // level selector between its lower and upper plans.
    const isDuplex = unit.type === 'DUPLEX' || /^d(ú|u)plex$/i.test(unit.subtitle || '');
    const typeStr = unit.type === 'storage' ? 'STORAGE' : (isDuplex ? 'DUPLEX' : 'APARTMENT');
    const bedrooms = unit.bedrooms || 'NULL';
    const bathrooms = unit.bathrooms || 'NULL';
    const areaSqm = unit.dimensions || 'NULL';
    const tourUrl = unit.tourUrl ? `'${unit.tourUrl}'` : 'NULL';
    const identifier = unit.identifier || unit.id;

    // SQLite JSON strings need single quotes escaped if they contain single quotes, but JSON doesn't contain single quotes usually (uses double quotes).
    // We just need to wrap the JSON string in single quotes: '${coordinates}'
    const coordsSql = coordinates === 'NULL' ? 'NULL' : `'${coordinates}'`;

    // Typology assets: the three views the unit page switches between plus the
    // interior gallery. Units that share a typology point at the same folder.
    const jsonList = (value) => (value && value.length > 0 ? `'${JSON.stringify(value)}'` : 'NULL');
    const furnished = jsonList(unit.photosFurnished);
    const unfurnished = jsonList(unit.photosUnfurnished);
    const plans = jsonList(unit.photosPlans);
    const gallery = jsonList(unit.gallery);

    sql += `INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery) VALUES ('${unitId}', '${floorId}', '${identifier}', '${typeStr}', ${bedrooms}, ${bathrooms}, ${areaSqm}, ${coordsSql}, '${state}', ${tourUrl}, ${furnished}, ${unfurnished}, ${plans}, ${gallery});\n`;
  }
}

// The /recorridos gallery. Thumbnails reuse each unit's first interior render.
// A duplex is one apartment across two floors, so only its lower level gets a
// row — tours.unit_id is unique, and both levels already share the same tour.
const TOUR_COLUMNS = 'id, title, subtitle, thumbnail_url, type, target_url, unit_id, is_active, "order"';

sql += `INSERT INTO tours (${TOUR_COLUMNS}) VALUES ('${BUILDING_TOUR.id}', '${BUILDING_TOUR.title}', '${BUILDING_TOUR.subtitle}', '${BUILDING_TOUR.thumbnail}', 'building', '${BUILDING_TOUR.target}', NULL, 1, 0);\n`;

let tourOrder = 1;
const seenTours = new Set();

for (const floor of floorsData) {
  for (const unit of floor.units) {
    const identifier = unit.identifier || unit.id;
    if (!unit.tourUrl || seenTours.has(identifier)) continue;
    seenTours.add(identifier);

    const unitId = `unit_${floor.id}_${unit.id.replace(/\s+/g, '_').toLowerCase()}`;
    const thumbnail = (unit.gallery && unit.gallery[0]) || BUILDING_TOUR.thumbnail;
    const subtitle = unit.subtitle || 'Departamento';

    sql += `INSERT INTO tours (${TOUR_COLUMNS}) VALUES ('tour-${identifier}', 'Unidad ${identifier}', '${subtitle}', '${thumbnail}', 'unit', '${unit.tourUrl}', '${unitId}', 1, ${tourOrder});\n`;
    tourOrder++;
  }
}

fs.writeFileSync('seed.sql', sql);
fs.writeFileSync('src/lib/db/seed.sql', sql);
console.log('Generated seed.sql and src/lib/db/seed.sql from src/data/floors.ts');
console.log('seed.sql generated!');
