const ASSET_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export const getAssetUrl = (path: string): string => {
  if (!path) return '';
  // Rutas del proxy same-origin (dev) y data URIs se sirven tal cual
  if (path.startsWith('/api/') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  let cleanPath = path;
  
  // Limpiar dominios conocidos para obtener la ruta/clave relativa
  const devR2Domain = 'https://pub-44777f1e13a04cbaa9c6d275228617c2.r2.dev';
  if (cleanPath.startsWith(devR2Domain)) {
    cleanPath = cleanPath.slice(devR2Domain.length);
  }
  
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2PublicUrl && cleanPath.startsWith(r2PublicUrl)) {
    cleanPath = cleanPath.slice(r2PublicUrl.length);
  }
  
  if (cleanPath.startsWith('http')) return cleanPath;
  
  // Ensure path doesn't start with slash
  const cleanPathNoSlash = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

  // Map icons are bundled with the application under public/ICONOS. They must
  // stay same-origin even when the rest of the media library is served by R2.
  if (cleanPathNoSlash.startsWith('ICONOS/')) {
    return `/${cleanPathNoSlash}`;
  }
  
  // Si es un archivo de video, lo servimos obligatoriamente por el proxy same-origin
  // para evitar problemas de CORS que impiden el streaming/Range requests en el navegador.
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
  const isVideo = videoExtensions.some(ext => cleanPathNoSlash.toLowerCase().endsWith(ext));
  if (isVideo) {
    return `/api/r2/${cleanPathNoSlash}`;
  }
  
  return `${ASSET_BASE_URL}/${cleanPathNoSlash}`;
};

// URL segura para cargar medios dentro de un canvas (Konva/toDataURL).
// El canvas exige same-origin o CORS; el dominio público de R2 no envía CORS
// para todos los orígenes, así que se enruta por el proxy /api/r2 de la app.
export const getCanvasImageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('/api/')) {
    return path;
  }
  let key = path;
  const devR2Domain = 'https://pub-44777f1e13a04cbaa9c6d275228617c2.r2.dev';
  if (key.startsWith(devR2Domain)) key = key.slice(devR2Domain.length);
  if (ASSET_BASE_URL && key.startsWith(ASSET_BASE_URL)) key = key.slice(ASSET_BASE_URL.length);
  // URLs externas (p. ej. Unsplash) no se pueden proxear: se devuelven tal cual
  if (key.startsWith('http')) return key;
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `/api/r2/${cleanKey}`;
};

export { assetManifest } from '../data/asset-manifest';
