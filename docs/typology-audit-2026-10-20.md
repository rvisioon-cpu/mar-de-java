# Revisión de imágenes de tipologías — 20 de octubre de 2026

## Fuente y comprobaciones

La descarga `~/Downloads/drive-download-20261020T220119Z-1-001.zip` terminó:
1.669.292.565 bytes, 224 entradas, ocho tipologías. Se validó el CRC de todas
las entradas y se extrajo en `/tmp/mar-java-typologies-20261020`, sin modificar
el ZIP ni los archivos existentes del proyecto.

Se compararon las 36 vistas principales (amoblado, entregable y CAD, incluyendo
ambos niveles de los dúplex) y las 89 imágenes de galerías principales con las
copias de `public/plants/details/`. Se reprodujo exactamente la conversión WebP
con calidad 85 del importador existente: 113 de 125 archivos coinciden por SHA-256.
Las 12 diferencias corresponden a toda la galería de 501.

Se consultó D1 de producción para comprobar las rutas que realmente usa la web.
Los enlaces Kuula corregidos previamente se conservaron; esta revisión no
modifica datos ni publica imágenes.

## Asignaciones incorrectas verificadas

Las cuatro categorías de imágenes (amoblado, entregable, plano y galería),
y las miniaturas de los recorridos, apuntan a estas carpetas equivocadas:

| Unidad | Carpeta configurada | Carpeta correspondiente al ZIP |
| --- | --- | --- |
| 101 | 102 | 101, T1 - FLAT 101 |
| 102 | 101 | 102, T2 - FLAT 102 |
| 201 | x02 | x01, T3 - FLAT 201 |
| 301 | x02 | x01, tipología compartida de 201 |
| 302 | x01 | x02, tipología compartida de 202 |
| 401 | x02 | x01, tipología compartida de 201 |

La correspondencia de 301/401 con 201 y 302/402 con 202 es la agrupación
establecida por el importador del proyecto; el ZIP no trae carpetas individuales
para todos esos departamentos. Las carpetas x01 y x02 contienen exactamente
los originales convertidos de FLAT 201 y FLAT 202, respectivamente.

## Galería incorrecta del dúplex 501

Las **15 imágenes actuales de la galería de 501 son copias idénticas de las
15 imágenes de la galería de 503**, almacenadas con el alias histórico `502`.
La carpeta `T7 - DUPLEX 501/GALERIA` del ZIP trae **12 imágenes propias**,
todas diferentes de las actuales. El problema afecta a las fichas de ambos
niveles de 501 y a la miniatura de su recorrido.

Sus seis vistas principales (tres por nivel) sí coinciden con los originales
correctos. Para reparar la galería habrá que cargar las 12 imágenes propias y
actualizar las listas de ambas plantas, evitando conservar tres entradas sobrantes.

## Correspondencias comprobadas

- 202 y 402 usan x02, que coincide con FLAT 202 del ZIP.
- 203 y 403 tienen las vistas de ambos niveles y galerías correctas.
- 503 tiene las vistas y galería correctas; el nombre interno `502` es un alias
  histórico de sus archivos, no una diferencia de contenido.
- El flat 502 usa x02. El ZIP no incluye una tipología propia de FLAT 502;
  no permite verificar de forma independiente si esa tipología compartida es la definitiva.

El ZIP también incluye subcarpetas `GALERIA/DETALLES` para varias tipologías.
La comparación anterior cubre las galerías principales que importa el proyecto;
la incorporación de esos detalles adicionales debe definirse aparte.

## Evidencia

- [Comparación visual 101 y 102](typology-audit-2026-10-20/comparison-101-102.png)
- [Comparación por archivo y hashes](typology-audit-2026-10-20/assets.json)

## Verificación de archivos servidos

Se solicitaron 128 rutas de imágenes utilizadas por la base de producción.
74 respuestas se completaron y coinciden exactamente con las copias locales;
las otras 54 superaron el límite de 12 segundos, a menudo después de recibir
parte del archivo. Esos tiempos de espera no demuestran ausencia ni corrupción.
No hubo respuestas completas con contenido diferente. La revisión completa del
contenido original se realizó contra las copias locales; la comprobación remota
de todos los archivos queda limitada por esos tiempos de descarga.

[Detalle de las solicitudes de producción](typology-audit-2026-10-20/production-assets.json).

La automatización de espera se eliminó al finalizar esta revisión.

## Corrección aplicada en producción

Por solicitud posterior del usuario se aplicó `0019_correct_typology_images.sql`
en D1 remoto y local. Corrige las seis asignaciones indicadas, mantiene las
correspondencias correctas de 202/402 y sincroniza las miniaturas. Ambas plantas
de 501 usan ahora sus 12 imágenes propias con claves que incluyen el hash del
contenido, evitando reutilizar la caché de las imágenes anteriores de 503.

Las 12 imágenes se publicaron en R2 antes de cambiar las referencias. Cada archivo
se descargó desde `/api/r2/` de producción y se verificó por SHA-256 contra el
WebP preparado desde el original del ZIP. El manifiesto reproducible está en
`typology-audit-2026-10-20/gallery-501-repair.json`; para volver a subir las mismas
copias locales se usa `scripts/upload-501-gallery.mjs` con la cuenta verificada.

Se corrigieron también los datos estáticos, los seeds y los scripts de reparación.
El script de intercambio de coordenadas ya no intercambia imágenes, galerías,
miniaturas ni recorridos. Las copias numéricas locales de la galería de 501 se
reemplazaron por los originales correctos y se retiraron las tres sobrantes,
tras guardarlas en `.wrangler/backups/before-image-fix-2026-10-20/`.
Los objetos antiguos de R2 quedan sin referencias para preservar la posibilidad
de recuperación.

Validación de la corrección:

- SQL probado dos veces sobre una copia de producción: idempotencia y preservación
  de todos los campos ajenos a imágenes/miniaturas, incluidos estados y tours.
- Seeds nuevos con las mismas imágenes que la migración.
- Consulta posterior de todas las unidades y recorridos: coincidencia con la
  migración validada, conservando los demás campos.
- Navegador público: 101, 102, 201, 301, 302 y 401 apuntan a sus imágenes correctas;
  la galería de 501 muestra `1 / 12` y carga el archivo nuevo completo.
- TypeScript, ESLint de los scripts de reparación y `git diff --check` correctos.

[Evidencia de 501 publicado](typology-audit-2026-10-20/501-published.png).
