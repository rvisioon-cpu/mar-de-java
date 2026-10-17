# Animaciones del edificio y entradas a plantas — 17 de octubre de 2026

Origen: carpetas `ANIMACIONES edificio` y `ANIMACIONES plantas` de Descargas. Se conservaron los originales.

Se prepararon 22 videos: 6 entradas desde las fachadas a plantas, 8 giros laterales, 6 cambios día/noche y 2 clips iniciales. La base de datos de producción ya referencia las claves siguientes; no se cambiaron sus registros. La `A` mayúscula en `1.2_A_2.2.mp4` es intencional para respetar esa configuración.

Conversión: FFmpeg, H.264, 1920 × 1080, 24 fps, yuv420p, CRF 26, maxrate/bufsize 4500k, preset fast, sin audio (la aplicación reproduce estos clips silenciados), `+faststart`. Duración conservada con tolerancia de 0,1 s; todos los archivos se decodificaron completos sin errores y se verificó que el átomo `moov` precede a `mdat`. Se inspeccionaron fotogramas de las aperturas y los finales de las seis entradas a plantas.

Peso total: 81.40 MB → 28.16 MB (65.4% menos). Las copias locales se guardaron en `public/building/`; los MP4 están excluidos por el .gitignore existente.

Destino: bucket R2 `mar-java-showroom`, cuenta verificada `432838854ddeae2316053e34c3948aef`. Metadatos: `video/mp4`, `Cache-Control: public, max-age=3600, must-revalidate`.

| Archivo de Descargas | Clave R2 | Bytes optimizados |
| --- | --- | ---: |
| ANIMACIONES edificio/0.1.mp4 | building/videos/0.1.mp4 | 1705530 |
| ANIMACIONES edificio/0.2.mp4 | building/transitions/0.1_a_1.1.mp4 | 1566371 |
| ANIMACIONES edificio/LATERALES/1-2 DIA.mp4 | building/transitions/1.1_a_2.1.mp4 | 1338453 |
| ANIMACIONES edificio/LATERALES/1-2 NOCHE.mp4 | building/transitions/1.2_A_2.2.mp4 | 1332722 |
| ANIMACIONES edificio/LATERALES/2-1 DIA.mp4 | building/transitions/2.1_a_1.1.mp4 | 1295213 |
| ANIMACIONES edificio/LATERALES/2-1 NOCHE.mp4 | building/transitions/2.2_a_1.2.mp4 | 1303388 |
| ANIMACIONES edificio/LATERALES/1-3 DIA.mp4 | building/transitions/1.1_a_3.1.mp4 | 1299914 |
| ANIMACIONES edificio/LATERALES/1-3 NOCHE.mp4 | building/transitions/1.2_a_3.2.mp4 | 1310411 |
| ANIMACIONES edificio/LATERALES/3-1 DIA.mp4 | building/transitions/3.1_a_1.1.mp4 | 1324607 |
| ANIMACIONES edificio/LATERALES/3-1 NOCHE.mp4 | building/transitions/3.2_a_1.2.mp4 | 1319827 |
| ANIMACIONES edificio/DIA-NOCHE/1. DIA-NOCHE.mp4 | building/transitions/1.1_a_1.2.mp4 | 1123745 |
| ANIMACIONES edificio/DIA-NOCHE/1. NOCHE-DIA.mp4 | building/transitions/1.2_a_1.1.mp4 | 1159058 |
| ANIMACIONES edificio/DIA-NOCHE/2. DIA-NOCHE.mp4 | building/transitions/2.1_a_2.2.mp4 | 1204052 |
| ANIMACIONES edificio/DIA-NOCHE/2. NOCHE-DIA.mp4 | building/transitions/2.2_a_2.1.mp4 | 1196919 |
| ANIMACIONES edificio/DIA-NOCHE/3. DIA-NOCHE.mp4 | building/transitions/3.1_a_3.2.mp4 | 1151235 |
| ANIMACIONES edificio/DIA-NOCHE/3. NOCHE-DIA.mp4 | building/transitions/3.2_a_3.1.mp4 | 1192042 |
| ANIMACIONES plantas/1.1.mp4 | building/transitions/1.1_a_PISO_6.mp4 | 1233037 |
| ANIMACIONES plantas/1.2.mp4 | building/transitions/1.2_a_PISO_6.mp4 | 1238366 |
| ANIMACIONES plantas/2.1.mp4 | building/transitions/2.1_a_PISO_6.mp4 | 1228022 |
| ANIMACIONES plantas/2.2.mp4 | building/transitions/2.2_a_PISO_6.mp4 | 1206930 |
| ANIMACIONES plantas/3.1.mp4 | building/transitions/3.1_a_PISO_6.mp4 | 1209774 |
| ANIMACIONES plantas/3.2.mp4 | building/transitions/3.2_a_PISO_6.mp4 | 1224052 |

Las entradas a plantas usan las claves `*_a_PISO_6.mp4`, que el código y la base de datos ya configuran como recorridos desde cada fachada y horario hasta la planta de entrada. Se comprobó visualmente que los seis clips llegan a una vista superior de la distribución.

Observación de integración: la configuración actual usa `0.1.mp4` como fondo con `loop` en `SceneController`. El material entregado tiene un inicio negro y movimiento hacia una vista más cercana, por lo que puede producir un salto visible al repetirse. Esta importación conserva el comportamiento existente; ajustar la secuencia de apertura requiere un cambio de código. La precarga heredada `videos/walks/trans_intro_to_0.mp4` tampoco se renombró artificialmente ni se cubrió con otro clip.

Validación remota: los 22 videos responden HTTP 200 en `/api/r2/` con `Content-Type: video/mp4` y el SHA-256 esperado. Las 22 solicitudes `Range: bytes=0-1023` respondieron 206, devolvieron exactamente 1024 bytes y un `Content-Range` coherente con el tamaño completo. En Chrome se comprobaron la entrada a la fachada central, el cambio de día a noche y el giro nocturno a la izquierda.

La prueba interactiva continuó desde la fachada izquierda nocturna mediante «Ingresar»: reprodujo la entrada configurada y llegó a `/plantas/6`, con el plano y selector de plantas visibles. Se guardó evidencia en `/tmp/mar-java-building-to-floor-verified.png`.
