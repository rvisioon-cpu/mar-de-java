# Apertura de «El edificio»

Secuencia implementada el 17 de octubre de 2026:

1. Al abrir `/showroom` (también con `?transition=intro`) se reproduce `building/videos/0.1.mp4` una sola vez. Mientras carga o se interrumpe, aparece `building/photos/0.1.webp`. El logo y el botón no se muestran.
2. Al finalizar, aparece `building/photos/0.2.webp` y se inicia `building/videos/cover-loop.mp4` en bucle. El loop se revela al reproducirse; si falla o espera datos, permanece la imagen 0.2. El logo y «Ingresar» comparten un contenedor vertical con el mismo eje horizontal y separación fija.
3. Al pulsar «Ingresar», el logo y el botón desaparecen inmediatamente, incluso durante la precarga. La transición `building/transitions/0.1_a_1.1.mp4` (archivo original `ANIMACIONES edificio/0.2.mp4`) se reproduce una vez hasta la fachada central. Los recorridos posteriores a plantas mantienen su funcionamiento.

Las rutas se configuran en `src/data/showroom.ts`; la secuencia y portada están en `src/components/360/BuildingOpening.tsx`. El reproductor general omite el video de fondo heredado de la cara inicial para evitar duplicar o repetir 0.1. No se modificaron datos D1.

El nuevo archivo `LOOP.mp4` de Descargas se conserva. Copia optimizada: `public/building/videos/cover-loop.mp4`, H.264, 1920 × 1080, 25 fps, 12,08 s, sin audio (reproducción silenciada), CRF 25, maxrate/bufsize 4500k, preset fast y faststart. Tamaño: 17.305.374 → 2.050.661 bytes. SHA-256: `81937b2b82b3a44c8fab483a6733bb7497c62aeaa1213970390664e5771b01ba`.

Se subió a R2 `mar-java-showroom` con `video/mp4` y `Cache-Control: public, max-age=3600, must-revalidate`. Producción respondió 206 con `Content-Range: bytes 0-1023/2050661`.

Pruebas de navegador: apertura sin CTA ni logo, loop separado, clic que oculta la portada inmediatamente y llegada a Cara Central. Alineación medida: centros horizontales de logo y botón coinciden con diferencia menor a 0,01 px; separación vertical de 32 px en la ventana de escritorio evaluada. Se usó un proxy temporal de prueba para demorar 0.1 ocho segundos y devolver 404 para el loop, sin modificar producción.

La comprobación final del fallo del loop confirmó fase `ready`, respaldo 0.2 decodificado y visible (2560 px, opacidad 1), logo/botón disponibles y video del loop oculto (sin conservar 0.1 en pantalla). La prueba de demora confirmó fase `opening`, video 0.1 con `readyState=0`, `loop=false`, opacidad 0, imagen 0.1 visible y ausencia del CTA.

`npm run build:worker` terminó correctamente, incluido `npm run build` y TypeScript. ESLint del componente nuevo y datos: cero errores, tres advertencias por imágenes HTML directas, utilizadas como respaldos ya optimizados para el reproductor.

Publicado en producción: https://17d582d6.mar-de-java.pages.dev (rama de producción `main`, proyecto Pages `mar-de-java`). Se verificó en https://mar-de-java.pages.dev/showroom que la apertura usa 0.1 con `loop=false` y sin branding visible.
