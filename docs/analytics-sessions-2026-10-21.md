# Conteo de visitas por sesión

El respaldo previo al reinicio contenía 1.260 aperturas de páginas, repartidas
entre 18 días con actividad. No eran 1.260 personas: el indicador sumaba una fila
por navegación o recarga. No se almacenaba una identidad de sesión, por lo que
no se puede reconstruir un número fiable de sesiones para esos registros.
Solo dos registros adicionales coincidían en página, dispositivo y segundo;
esa coincidencia por sí sola no demuestra que fueran duplicados.

## Comportamiento actualizado

- Una visita corresponde a una sesión del navegador, compartida mediante una
  cookie HttpOnly. Se renueva el vencimiento en cada página registrada y se
  inicia otra sesión tras 30 minutos sin eventos de navegación.
- El total, la tendencia temporal y los dispositivos cuentan sesiones por su
  fecha de inicio. Abrir o recargar varias páginas durante una sesión suma
  páginas vistas, pero no visitas nuevas.
- Las estadísticas por departamento y zona mantienen las aperturas de páginas
  y se identifican como páginas vistas donde corresponde.
- Cada evento nuevo tiene un identificador reutilizable: repetir el envío no
  crea otra página vista ni otra sesión. Los envíos del navegador se ordenan
  para conservar la cookie incluso al navegar rápidamente.
- Los tiempos ausentes valen cero. Se retiró la simulación anterior de 30 a
  149 segundos y se corrigió la asignación de respuestas tardías a sus páginas.

`0022_analytics_sessions.sql` agrega la tabla de sesiones y su relación con las
páginas vistas. Los registros anteriores se conservan para los informes de
páginas; no se les asignan sesiones inventadas. El conteo de sesiones comienza
con esta actualización. Se aplicó la migración directamente y se registró su
nombre en `d1_migrations` para evitar repetir cambios de estructura.

Validación: diez pruebas con SQLite y control del reloj, ciclo de efectos de
React, navegación rápida, cookie de sesión y alcance del middleware; TypeScript,
ESLint de los archivos nuevos de captura y compilación Next.js correctos.
Respaldo privado de D1: `.wrangler/backups/before-analytics-sessions-2026-10-21.sql`.
