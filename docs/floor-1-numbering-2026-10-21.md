# Intercambio de numeración de planta 1

Aplicado a D1 remoto y local el 21 de octubre de 2026 mediante
`drizzle/0020_swap_floor_1_numbering.sql`.

| Departamento anterior | Número nuevo | Ubicación | Recorrido |
| --- | --- | --- | --- |
| 101 | 102 | Izquierda, 108.06 m² | 7dlHt |
| 102 | 101 | Derecha, 110.89 m² | 7dlM4 |

Los identificadores internos permanecen estables para conservar las relaciones
con imágenes, estados comerciales e historial. Los títulos de los recorridos
se actualizaron al nuevo número; cada colección permanece con su departamento.
La numeración solicitada sustituye la correspondencia del informe del día 20.

Se actualizaron el respaldo estático, ambos seeds y los scripts de mantenimiento
de recorridos, tipologías, coordenadas y sincronización.

Validación: migraciones desde cero con seed, ejecución repetida de la nueva
migración y comparación completa de unidades y recorridos de producción antes
y después. Solo cambiaron los dos números, sus fechas de actualización y los
dos títulos de recorrido. Copias privadas en `.wrangler/backups/`.

Navegador público: la planta 1 abre el nuevo 101 de 110.89 m² y su iframe
apunta a `7dlM4`; la ficha del nuevo 102 muestra 108.06 m² y apunta a `7dlHt`.
