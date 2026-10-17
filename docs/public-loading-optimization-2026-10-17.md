# Carga pública y recursos del mapa — 17 de octubre de 2026

El layout raíz dejó de consultar pisos/fachadas y de forzar renderizado dinámico en todas las páginas. Los layouts de `/showroom`, `/plantas` y `/unidad` usan `ShowroomDataLayout`, que solicita los dos conjuntos en paralelo. Estas rutas mantienen renderizado dinámico y la hidratación del inventario en el store. La consulta compartida de React se conserva para evitar repetir lecturas dentro de una misma solicitud.

`getFloorsData` agrupa pisos y unidades mediante `db.batch` (un viaje a D1); obtiene la sesión en paralelo y conserva el filtrado de áreas comunes para SUPER_ADMIN antes de devolver los datos. No se agregó caché compartida de datos que dependen del usuario.

El middleware de autenticación se limita a `/dashboard/:path*` y `/login`. El layout del dashboard y las acciones del servidor mantienen sus verificaciones. Las páginas públicas y los archivos estáticos ya no atraviesan la inicialización de sesión.

Se retiró el stylesheet externo de Mapbox del layout raíz. Los estilos de Mapbox y MapLibre pertenecen al componente del mapa y se cargan con él. En Ubicación, ese componente usa importación dinámica sin SSR y empieza a cargar cuando se ofrece explorar el mapa o el usuario salta el video. La selección inicial del panel se realiza después de hidratar para mantener el mismo HTML inicial en servidor y navegador.

La compilación prerenderiza portada, contacto, ubicación, galería, recorridos, videos, maqueta y páginas legales. Dashboard, avances de obra, plantas, unidades y showroom siguen siendo dinámicos cuando corresponde.

Medición del cuerpo HTML antes/después (no es una medición de tiempo de carga; antes corresponde a producción y después a la compilación local equivalente):

| Ruta | Antes | Después | Reducción |
| --- | ---: | ---: | ---: |
| Portada | 49.633 B | 29.928 B | 39,7 % |
| Contacto | 56.352 B | 36.658 B | 34,9 % |
| Política de privacidad | 58.016 B | 38.251 B | 34,1 % |

Las diferencias mínimas entre solicitudes pueden depender del payload de Next.js. La reducción corresponde principalmente a retirar el inventario y las fachadas de páginas que no los necesitan.

Verificación: seis pruebas automatizadas entre datos/roles, alcance del middleware, precargas y caché. El smoke HTTP cubre nueve rutas, protección anónima del dashboard, ausencia de cookies de autenticación en páginas públicas, ausencia de payload de inventario y estilos de motores de mapa en la portada. Navegación real local portada → showroom → fachada central → Planta 6 y acceso directo a la unidad 101 funcionando. El mapa no tenía canvas durante el inicio del video; al saltarlo se montó el canvas de 1904 × 806 con sus estilos de posición.

La compilación final se realiza en una copia aislada para excluir el rediseño de Avance de obra y las rutas temporales de vista previa que se están editando en paralelo. Los originales del workspace se conservan.

Compilación final aislada: `npm run build:worker` exitoso (incluye Next.js y TypeScript), con Avance de obra explícitamente dinámico para no fijar registros D1 durante el build. Smoke final: nueve rutas correctas. Mapa final en Chrome: canvas y estilos cargados, sin errores de hidratación. Se conserva la advertencia existente del proveedor de mapas sobre un selector de lugares.

Publicación: https://0d1d9d84.mar-de-java.pages.dev, proyecto `mar-de-java`, rama `main`. En producción, portada/contacto/política respondieron sin cookies de autenticación, con HTML de 29.928 / 36.658 / 38.251 bytes y caché compartida para el contenido estático. El video de apertura mantuvo respuesta 206 con Range correcto.
