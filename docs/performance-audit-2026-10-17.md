# Evaluación de rendimiento — 17 de octubre de 2026

Sitio evaluado: https://mar-de-java.pages.dev/ y /showroom. Pruebas HTTP desde este equipo y revisión en Chrome, sin limitar artificialmente la red. No se modificó la aplicación ni la infraestructura.

## Diagnóstico

Hay dos problemas comprobados: faltan recursos críticos del showroom y la transferencia de multimedia es lenta y variable. No hay mediciones históricas equivalentes para atribuir toda la regresión a un despliegue concreto.

### 1. Prioridad crítica: recursos del showroom devuelven 404

Se verificaron estas rutas:

- `/api/r2/building/videos/0.1.mp4`: 404; es el video de fondo de la primera vista.
- `/api/r2/building/photos/0.1.webp`: 404. También falla su URL pública en R2, en tres intentos.
- `/api/r2/building/transitions/0.1_a_1.1.mp4`: 404; transición de entrada.
- `/api/r2/videos/walks/trans_intro_to_0.mp4`: 404; precarga de la portada.
- La URL pública de `building/photos/face_0_daylight.png`: 404 en tres intentos.

Chrome confirmó que la imagen inicial tiene `naturalWidth=0`, que el video inicial permanece con `readyState=0` y que aparecen avisos de fallo de video y precargas de imágenes. También aparecen fallos de precarga para otras caras (`2.1.webp`, `1.1.webp`, `3.1.webp`); estas últimas no se verificaron individualmente por HTTP.

Impacto: la vista inicial del edificio no puede aparecer simplemente esperando más tiempo. Revisar las claves realmente existentes en el bucket de producción y su correspondencia con los valores de `building_faces` y `src/data/buildingFacesSeed.ts`. Si faltan archivos, restaurarlos en el bucket correcto; si están con otros nombres, corregir las referencias.

### 2. Prioridad alta: portada 4K y transferencia variable

El video reproducido en Chrome es de 3840 × 2160, dura 38,25 segundos y pesa 49.310.936 bytes (49,3 MB). El servidor admite rangos: una solicitud de 1 MiB devuelve correctamente 206. El tamaño completo no implica que deba descargarse entero antes de reproducirse.

| Solicitud | Primera prueba: TTFB / total | Tres repeticiones: tiempo total |
| --- | --- | --- |
| Portada HTML | 0,35 s / 1,55 s | 2,53 / 1,21 / 0,55 s |
| Showroom HTML | 2,94 s / 2,95 s | 2,47 / 1,28 / 0,58 s |
| Poster de portada, 611 kB | 1,67 s / 12,07 s | 3,68 / 0,63 / 0,70 s |
| Primer MiB del video | 4,67 s / 7,91 s | 0,70 / 5,07 / 8,11 s |

Son tiempos de solicitudes, no tiempos de renderizado. Las pruebas se ejecutaron con hasta cuatro solicitudes concurrentes, y las repeticiones con hasta tres; reflejan competencia de red y no aíslan proveedor, conexión local, ubicación del bucket o arranque del Worker.

Recomendación: generar variantes del video para móvil y escritorio, medir calidad y peso, y servir el poster sin depender de la ruta dinámica de multimedia cuando sea posible. No se asigna un ahorro en segundos sin medir una variante real.

El archivo local anterior `public/homepage/intro_video.mp4` y el actual `public/videos/video_portada.mp4` tienen el mismo tamaño y el átomo `moov` al principio. No hay evidencia de que el cambio de nombre haya aumentado el peso ni de un problema de metadatos MP4 al final.

### 3. Prioridad media: solicitudes fallidas y precarga repetida

`src/app/page.tsx:43` precarga recursos ausentes al montar; `src/app/page.tsx:146` vuelve a precargar rutas ausentes en cada `canplay`. Los avisos de Chrome confirman repeticiones. `src/utils/preload.ts:37` crea un elemento de video en cada llamada, sin deduplicar por URL; su timeout resuelve la promesa pero no cancela explícitamente la transferencia.

Recomendación: usar referencias válidas de los datos del edificio, deduplicar precargas y priorizar el medio visible. Esto reduce solicitudes innecesarias; el ahorro temporal aún no está medido.

### 4. Prioridad media: trabajo dinámico antes de servir páginas

`src/app/layout.tsx:2` fuerza renderizado dinámico. El layout espera secuencialmente pisos y caras del edificio (`:46`, `:51`), incluso en portada. La consulta de pisos espera autenticación y después consulta pisos y unidades secuencialmente. `cache()` de React no equivale a una caché persistente entre solicitudes.

Las respuestas HTML observadas llevan `private, no-cache, no-store`. El middleware también incluye archivos públicos y ejecuta autenticación para ellos. Esto añade trabajo potencial, aunque no se midió por separado cuánto cuesta D1 o autenticación.

Recomendación: cargar los datos del showroom en las rutas que los necesitan, paralelizar lecturas independientes y limitar el alcance del middleware. Cualquier caché compartida debe separar los datos públicos de los que dependen del rol del usuario.

### 5. Distribución y caché de medios

Las imágenes del edificio apuntan a un subdominio `r2.dev`. Cloudflare documenta que esos dominios son para desarrollo, tienen límites de solicitudes y requieren un dominio propio para disponer de caché de Cloudflare: https://developers.cloudflare.com/r2/buckets/public-buckets/ . No se observaron respuestas 429, por lo que no se demuestra que un límite sea la causa actual.

El video tiene `Cache-Control: public, max-age=86400`; el poster, `public, max-age=3600, must-revalidate`. Existe caché de navegador configurada. La ruta R2 lee mediante binding y no implementa explícitamente Cache API; las pruebas no acreditan una caché CDN efectiva. El último commit mueve `homepage/` y `amenities/` a esa ruta y los excluye del paquete de Pages: es un cambio relevante de distribución, pero no prueba por sí solo la regresión.

## Orden de intervención

1. Restablecer imágenes y videos críticos y verificar HTTP 200/206 y reproducción real.
2. Corregir precargas inválidas y repetidas.
3. Optimizar video y poster y comparar cargas equivalentes antes/después.
4. Reducir dependencias de base de datos y autenticación en páginas públicas; revisar distribución con caché de medios.

## Límites

No se obtuvieron trazas de Chrome DevTools ni Lighthouse: no había herramientas de trazas disponibles y el evaluador del navegador no expuso Performance API. LCP, CLS, INP, FCP y TBT quedan sin medir; no se inventa una puntuación. No se midieron consultas D1 individualmente ni se consultaron métricas históricas del proveedor. Se verificó la estructura accesible de portada y showroom, pero no se realizó una auditoría completa de accesibilidad. No se ejecutó build porque el trabajo fue de diagnóstico y documentación.
