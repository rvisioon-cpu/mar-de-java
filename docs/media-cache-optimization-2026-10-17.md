# Precargas y distribución de medios — 17 de octubre de 2026

Se eliminaron de la portada las rutas obsoletas `videos/walks/trans_intro_to_0.mp4` y `building/photos/face_0_daylight.png`, así como el overlay de intro que ya no se activaba. La precarga de entrada ahora usa `showroomConfig.opening` una sola vez cuando el video principal puede reproducirse.

`preloadVideo` comparte una promesa por URL normalizada, aprovecha un reproductor ya montado y limita la retención a ocho videos durante 60 segundos. Cancela las cargas estancadas a los seis segundos y aplica un breve periodo de cinco segundos antes de reintentar un fallo. Libera elementos y buffers al expirar o desalojar una entrada. Esto evita crear precargas duplicadas; las solicitudes Range necesarias para reproducir o buscar dentro de un video siguen siendo normales.

`getAssetUrl` dirige las imágenes remotas conocidas de R2 a `/api/r2/` en el dominio de la aplicación. Los medios empaquetados (identidad, iconos y planos generales) conservan sus rutas estáticas. Los proveedores externos conservan sus URLs. No se cambió DNS ni se agregó otro dominio: se aprovecha el dominio Pages y el dominio propio ya conectado al sitio.

`scripts/worker/r2-media.mjs`, integrado mediante `patch-worker.mjs`, implementa Cache API para GET y HEAD de los medios públicos del showroom. Excluye APIs de aplicación, rutas ajenas a la lista pública, escrituras y objetos marcados como privados/no-store/no-cache. Mantiene ETag, Last-Modified y soporte Range. Los segmentos se almacenan bajo claves internas distintas de las del archivo completo, como respuestas internas 200, y se restauran como 206 al servir el rango exacto. Nunca se guarda un 206 como si fuera el archivo completo.

Vigencia: `public, max-age=3600, must-revalidate`, sin immutable de un año sobre claves que se pueden reemplazar. No se cachean cuerpos mayores a 8 MiB; los videos grandes mantienen el streaming y sus segmentos de hasta 8 MiB sí pueden reutilizar caché. Las escrituras se mantienen vivas con `ctx.waitUntil` y el cuerpo se transmite como stream. El header `X-Media-Cache` permite distinguir HIT/MISS/BYPASS. La caché es local al centro de datos; un visitante en otro centro puede tener su primer MISS.

Validación:

- Cuatro pruebas automatizadas: concurrencia y normalización de URL, expiración y cancelación de precargas, límite de buffers, rangos/sufijos, archivos completos, ETag/304, HEAD, If-Range y exclusión de datos privados.
- `npm run build:worker`, incluido Next.js y TypeScript, exitoso en una copia aislada. ESLint de los archivos de rendimiento sin errores; queda la advertencia existente por la imagen HTML del logo en portada.
- Runtime de Wrangler: MISS → HIT para archivo completo, primer segmento y sufijo, con bytes y ETag correctos.
- Producción: MISS → HIT en `/api/r2/building/videos/0.1.mp4`, `/api/r2/building/videos/cover-loop.mp4` (Range) y `/api/r2/building/photos/0.2.webp` (completa).
- Los doce scripts de la portada publicada no contienen las rutas obsoletas. El módulo publicado incluye la deduplicación y la detección de reproductores ya montados.
- Chrome: portada reproducible con `readyState=4`, sin avisos/errores durante la prueba.

La publicación vigente verificada fue `b7486551-a8b9-4046-9d91-c432d2fcc644`, que se publicó en paralelo e incluye estos cambios junto con los cambios de identidad. No se reemplazó por la compilación aislada para evitar revertir esa actualización.

Referencias consultadas: https://developers.cloudflare.com/workers/runtime-apis/cache/ y https://developers.cloudflare.com/r2/examples/cache-api/ .
