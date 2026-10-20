# Multimedia — 20 de octubre de 2026

El vídeo general procede de `Downloads/contenido amenidades/VIDEO GENERAL.mp4`.

- R2: `mar-java-showroom/videos/video_general_b830a6611c68.mp4`
- Copia local para cargas: `public/videos/video_general_b830a6611c68.mp4`
- SHA-256: `b830a6611c68b5eee0dc4738ae21250ff498fd38d061d54a6e07d65649999621`
- Tamaño: 206838424 bytes; duración: 149.79 s; vídeo H.264 3840 × 2160 y audio AAC.

Los vídeos están excluidos de Git y del paquete de Pages; se sirven desde R2.
La clave versionada evita reutilizar la caché de la versión anterior.
Antes de ejecutar `scripts/upload-home-media.mjs`, colocar el archivo fuente en
la ruta local indicada y verificar su SHA-256.

La migración `0015_refresh_general_video_and_amenities.sql` activa esta versión
y añade Sótano 1, Sótano 2 y Sótano 3 sin eliminar las entradas existentes.
También se actualizan las imágenes R2 `amenities/9.webp`, `15.webp`, `16.webp`
y `17.webp` con las copias de `public/amenities/`.

Las correcciones de numeración y tipologías de unidades ya estaban aplicadas
en producción antes de esta actualización. Sus scripts SQL se conservan como
referencia; no es necesario volver a ejecutarlos para publicar el vídeo.
