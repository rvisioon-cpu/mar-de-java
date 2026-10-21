# Revisión de recorridos — 20 de octubre de 2026

Se abrieron las 14 colecciones en Kuula y se comprobó su título real.

| Unidad | Colección | Título de Kuula |
| --- | --- | --- |
| 101 | 7dlHt | FLAT 101 - MAR DE JAVA |
| 102 | 7dlM4 | FLAT 102 - MAR DE JAVA |
| 201 | 7dlMh | FLAT 201 - MAR DE JAVA |
| 202 | 7dlMZ | FLAT 202 - MAR DE JAVA |
| 203 | 7dlMd | DÚPLEX 203 - MAR DE JAVA |
| 301 | 7dlMP | FLAT 301 - MAR DE JAVA |
| 302 | 7dlMD | FLAT 302 - MAR DE JAVA |
| 401 | 7dlMF | FLAT 401 - MAR DE JAVA |
| 402 | 7dlMH | FLAT 402 - MAR DE JAVA |
| 403 | 7dlM3 | DÚPLEX 403 - MAR DE JAVA |
| 501 | 7dlMt | DÚPLEX 501 - MAR DE JAVA |
| 502 | 7dPKv | FLAT 502 - MAR DE JAVA |
| 503 | 7dlT4 | DÚPLEX 503 - MAR DE JAVA |
| General | 7dhMt | MAR DE JAVA (inicio: FACHADA) |

Producción tenía intercambiados 101/102, 201/202, 301/302 y 401/402.
502 usaba la colección de 401; 503 y su nivel superior usaban la de 502.
Se corrigieron `units.tour_url` y `tours.target_url` conservando los parámetros
originales de inserción. El general ya coincidía con el enlace proporcionado.
En la primera revisión se retiró el enlace ajeno de 503. Posteriormente el cliente
entregó `7dlT4`, cuyo título se comprobó en Kuula como DÚPLEX 503 - MAR DE JAVA.
La migración `0018_restore_duplex_503_tour.sql` configura ambas plantas y reactiva
su recorrido en la galería.

La migración `0017_correct_kuula_tour_assignments.sql` se ejecutó directamente
con Wrangler en D1 remoto y local. La copia previa de producción está en
`.wrangler/backups/before-tour-fix-2026-10-20.sql` (privada, excluida de Git).
Es idempotente; puede volver a ejecutarse mediante el sistema de migraciones.
`scripts/update-tours.sql` permite la misma reparación sin borrar tablas.
Los seeds y los scripts históricos se corrigieron para evitar nuevas asignaciones erróneas.

Validación:

- Consulta posterior a producción: 14 recorridos activos correctos, incluido 503.
- Navegador público: iframe de 101 apunta a 7dlHt y el de 502 a 7dPKv.
- Migración repetida sobre la copia de producción: enlaces consistentes y
  especificaciones, imágenes, estados comerciales y demás campos preservados.
- Migraciones desde cero más seed en SQLite: 14 recorridos correctos y
  ambas copias del seed idénticas.
- `git diff --check` y sintaxis del generador de intercambio correctos.
