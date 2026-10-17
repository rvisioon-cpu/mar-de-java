import type { GalleryImage } from '../data/galleries';
import { getAssetUrl } from './assets';

/**
 * Generates a list of images for a specific floor and type.
 * Assumes a folder structure: /images/floors/{floorId}/{type}/{i}.jpg
 * 
 * @param floorId The ID of the floor (e.g., "1", "4")
 * @param type The type of images ('gallery' or 'views')
 * @param count Number of mock images to generate (default 6 for demo)
 */
export const getFloorImages = (floorId: string, type: 'gallery' | 'views', count: number = 6): GalleryImage[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = `${floorId}-${type}-${i + 1}`;
    // For demo purposes using placeholders, but structure reflects requirements
    // Real path would be: `/images/floors/${floorId}/${type}/${i + 1}.jpg`
    const isView = type === 'views';
    const text = isView ? `View ${i + 1} - Floor ${floorId}` : `Gallery ${i + 1} - Floor ${floorId}`;
    const bg = isView ? '2a2a2a' : '1a1a1a';
    
    return {
      id,
      // Using local mock images for views, placeholder for gallery
      src: isView ? '/mock/view_normal.png' : `https://placehold.co/1200x800/${bg}/ffffff?text=${encodeURIComponent(text)}`,
      alt: text,
      title: text,
      description: isView 
        ? `Panoramic view from floor ${floorId}` 
        : `Interior detail of floor ${floorId}`,
      highlightUrl: isView 
        ? '/mock/view_highlight.png'
        : undefined
    };
  });
};

/**
 * Generates a list of candidate images for a gallery.
 * These are "potential" images that need to be probed/verified by the client.
 * 
 * @param prefix The folder prefix (e.g. 'amenities/')
 * @param count Max number of images to try to find
 */
export const getGalleryCandidates = (prefix: string, count: number = 20): GalleryImage[] => {
    // Generate variations for each index to handle file extensions and numbering formats
    const candidates: GalleryImage[] = [];
    
    for (let i = 0; i < count; i++) {
        const num = i + 1;
        const paddedNum = num.toString().padStart(2, '0');
        
        // Variations to try
        const variations = [
            `${num}.webp`,      // 1.webp
            `${paddedNum}.webp`, // 01.webp
            `${num}.png`,       // 1.png
            `${num}.jpg`,       // 1.jpg
            `${num}.jpeg`,      // 1.jpeg
            `${paddedNum}.png`, // 01.png
            `${paddedNum}.jpg`, // 01.jpg
        ];
        
        variations.forEach(fileName => {
            const path = `${prefix}${fileName}`;
            
            candidates.push({
                id: `candidate-${prefix}-${fileName}`, // Unique ID for every variation
                src: getAssetUrl(path),
                alt: '',
                title: ''
            });
        });
    }
    
    return candidates;
};
