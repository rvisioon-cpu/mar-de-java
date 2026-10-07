/**
 * Asset Manifest
 * List all assets that need to be preloaded or are located in the remote storage.
 * This file should be updated whenever new assets are added to the project.
 */

// Unit typologies ("5. TIPOLOGÍAS COMPLETO"). Each folder holds the three views
// the unit page switches between (furnished / unfurnished / plans) plus the six
// transition videos between them. Flats that repeat on several floors share one
// folder: x01 = 201/301/401, x02 = 202/302/402. The duplexes have one folder per
// level (501.1 lower, 501.2 upper) but a single shared gallery.
const unitViewFolders = ['101', '102', 'x01', 'x02', '501.1', '501.2', '502.1', '502.2'];

const unitTransitions = [
    'furnished_to_unfurnished',
    'unfurnished_to_furnished',
    'furnished_to_plans',
    'plans_to_furnished',
    'unfurnished_to_plans',
    'plans_to_unfurnished',
];

const unitGalleries: Record<string, number> = {
    '101': 9,
    '102': 8,
    'x01': 8,
    'x02': 7,
    '501': 12,
    '502': 12,
};

const unitViewAssets = unitViewFolders.flatMap(folder => [
    `plants/details/${folder}/furnished.webp`,
    `plants/details/${folder}/unfurnished.webp`,
    `plants/details/${folder}/plans.webp`,
    ...unitTransitions.map(name => `plants/details/${folder}/transitions/${name}.mp4`),
]);

const unitGalleryAssets = Object.entries(unitGalleries).flatMap(([folder, count]) =>
    Array.from({ length: count }, (_, i) => `plants/details/${folder}/gallery/${i + 1}.webp`)
);

export const assetManifest: string[] = [
    // Homepage
    'homepage/intro.webp',
    'homepage/intro_video.mp4',

    // Location Assets
    'location/photos/FOTO_VISTA_PLANETA_PERU.webp',
    'location/videos/video_mapa_final.mp4',
    'ICONOS/proyecto/logo-proyecto.png',
    'ICONOS/otros-proyectos/logo-bujele.png',

    // Building Assets
    'building/photos/0.1.webp',
    'building/videos/0.1.mp4',
    'building/transitions/0.1_a_1.1.mp4',
    'building/photos/1.1.webp',
    'building/photos/1.2.webp',
    'building/transitions/1.1_a_1.2.mp4',
    'building/transitions/1.2_a_1.1.mp4',
    'building/photos/2.1.webp',
    'building/photos/2.2.2.webp',
    'building/transitions/2.1_a_2.2.mp4',
    'building/transitions/2.2_a_2.1.mp4',
    'building/photos/3.1.webp',
    'building/photos/3.2.webp',
    'building/transitions/3.1_a_3.2.mp4',
    'building/transitions/3.2_a_3.1.mp4',
    'building/transitions/1.1_a_2.1.mp4',
    'building/transitions/1.1_a_3.1.mp4',
    'building/transitions/1.2_A_2.2.mp4',
    'building/transitions/1.2_a_3.2.mp4',
    'building/transitions/2.1_a_1.1.mp4',
    'building/transitions/2.2_a_1.2.mp4',
    'building/transitions/3.1_a_1.1.mp4',
    'building/transitions/3.2_a_1.2.mp4',

    // Building -> Floors entry walks (one per face / time of day, all land on PISO 6)
    'building/transitions/1.1_a_PISO_6.mp4',
    'building/transitions/1.2_a_PISO_6.mp4',
    'building/transitions/2.1_a_PISO_6.mp4',
    'building/transitions/2.2_a_PISO_6.mp4',
    'building/transitions/3.1_a_PISO_6.mp4',
    'building/transitions/3.2_a_PISO_6.mp4',

    // Floor plans
    'plants/floor_s2.webp',
    'plants/floor_s1.webp',
    'plants/floor_1.webp',
    'plants/floor_2.webp',
    'plants/floor_3.webp',
    'plants/floor_4.webp',
    'plants/floor_5.webp',
    'plants/floor_6.webp',

    // Unit typologies (views + transitions, then the galleries)
    ...unitViewAssets,
    ...unitGalleryAssets,

    // Amenities
    'amenities/1.webp',
    'amenities/2.webp',
    'amenities/3.webp',
    'amenities/4.webp',
    'amenities/5.webp',
    'amenities/6.webp',
    'amenities/7.webp',
];
