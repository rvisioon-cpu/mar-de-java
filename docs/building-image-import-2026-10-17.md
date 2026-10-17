# Imágenes del edificio — importación del 17 de octubre de 2026

Origen: carpeta local de Descargas, `imagenes del edificio`. Los JPG originales se conservaron.

Conversión: Sharp, orientación automática, ancho máximo 2560 px sin ampliar ni recortar, WebP calidad 78, effort 6. Peso conjunto: 79.43 MB → 6.49 MB (91.8% menos).

Copias del proyecto: `public/building/photos/`. Destino remoto: bucket R2 `mar-java-showroom`, cuenta verificada `432838854ddeae2316053e34c3948aef`. Metadatos: `image/webp`, `Cache-Control: public, max-age=3600, must-revalidate`.

| Original | Clave R2 | Resolución | Bytes |
| --- | --- | --- | ---: |
| 0.1.jpg | building/photos/0.1.webp | 2560 × 1440 | 872888 |
| 0.2.jpg | building/photos/0.2.webp | 2560 × 1440 | 693336 |
| 1.1 FINAL.jpg | building/photos/1.1.webp | 2560 × 1440 | 1037676 |
| 1.2 FINAL.jpg | building/photos/1.2.webp | 2560 × 1441 | 746708 |
| 2.1 FINAL.jpg | building/photos/2.1.webp | 2560 × 1440 | 809392 |
| 2.2 FINAL.jpg | building/photos/2.2.2.webp | 2560 × 1441 | 728882 |
| 3.1 FINAL.jpg | building/photos/3.1.webp | 2560 × 1440 | 925002 |
| 3.2 FINAL.jpg | building/photos/3.2.webp | 2560 × 1441 | 680114 |

La imagen fuente `2.2 FINAL.jpg` usa la clave `2.2.2.webp` para respetar la configuración existente de la base de datos y los datos estáticos. No se cambiaron registros D1. `0.2.webp` queda disponible como recurso adicional; la cara inicial sigue usando `0.1.webp` de día y de noche, según su configuración actual.

Esta importación cubre imágenes; los videos y las transiciones requieren sus archivos correspondientes.

Validación: las ocho imágenes responden HTTP 200 con `Content-Type: image/webp` tanto en el dominio público de R2 como en `/api/r2/` de producción. Se comparó SHA-256 de cada descarga con el archivo local (16 comprobaciones). Chrome cargó y decodificó la imagen inicial a 2560 × 1440 y mostró el fondo del showroom. No hubo cambios estructurales ni despliegue de código.
