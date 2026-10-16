# Base de datos y dashboard

## Destino de producción

Proyecto Pages: `mar-de-java`, sitio `https://mar-de-java.pages.dev`.
D1: `mar-java-db`, ID `63d3785c-851f-4793-9b86-9dc205f32d43`, binding `DB`.
La cuenta usada por la configuración de Wrangler es `432838854ddeae2316053e34c3948aef`.
Antes de operar, comprobar con `npx wrangler whoami` que la sesión tiene acceso a esa cuenta.
No crear otra base ni cambiar el binding para eludir un error de autorización.

## Inicialización segura

```sh
npm run db:bootstrap -- --local
npm run db:bootstrap -- --remote
```

El comando comprueba primero el acceso, exporta una copia de seguridad en
`.wrangler/backups/` antes de cualquier cambio remoto, aplica las migraciones
pendientes y agrega únicamente registros iniciales ausentes. Comprueba las
relaciones y los contenidos al finalizar. Se puede repetir: no modifica estados
de unidades, cuentas, contraseñas ni registros existentes, incluidos los eliminados
lógicamente. No usar `db:seed:remote` para esta operación: el seed heredado borra
tours, unidades, plantas y parte de los medios, y agrega cuentas de la plantilla.

La inicialización incluye plantas, unidades, recorridos, medios, caras del edificio,
amenidades, puntos del mapa y opciones del menú. Los avances de obra se publican
desde el dashboard; leer una tabla vacía ya no crea avances ficticios.

## Administrador

```sh
npm run db:admin -- --local < /ruta/privada/password.txt
npm run db:admin -- --remote < /ruta/privada/password.txt
```

El archivo de entrada debe ser privado y contener únicamente la contraseña.
Eliminarlo después de usarlo. El comando nunca recibe la contraseña como argumento,
guarda solo un hash bcrypt y rechaza sobrescribir cuentas existentes.

Crea el nombre `Admin` con rol `SUPER_ADMIN`, necesario para administrar todas las
secciones del sitio. El identificador de acceso es `Admin`, sin distinguir mayúsculas.
También sigue siendo posible iniciar sesión con correo. Si no se proporciona
`--email=correo@dominio.com`, la cuenta usa `admin@mar-de-java.invalid`, una dirección
interna que no recibe correo. Los nombres ambiguos se rechazan en el acceso.

Configurar `AUTH_SECRET` o `NEXTAUTH_SECRET` como secreto en Pages antes de desplegar;
el código ya no usa una clave pública de respaldo. Comprobar también que `AUTH_URL`
y `NEXTAUTH_URL`, si están configuradas, correspondan al dominio de producción.

## Validación aislada

```sh
npm run db:bootstrap -- --local --persist-to=/tmp/mar-java-db-validation
npm run db:admin -- --local --persist-to=/tmp/mar-java-db-validation < /ruta/privada/password.txt
npm run build:worker
npx wrangler pages dev .open-next/assets --port 8789 --persist-to=/tmp/mar-java-db-validation
node tests/database-dashboard-smoke.mjs < /ruta/privada/password.txt
```

El smoke test usa únicamente localhost, comprueba los rechazos de acceso, la sesión
por nombre y por correo y la respuesta de las 17 secciones del dashboard y las
principales páginas públicas. Valida respuestas HTTP/SSR; no prueba interacciones
completas del navegador, envíos de correos ni generación de imágenes.

La versión instalada de Wrangler (4.86.0) incluye un runtime que soporta hasta
`2026-05-03`, anterior a la fecha `2026-06-01` de la configuración. Para esta validación
local se usó `--compatibility-date 2026-05-03`. La configuración de producción se
conservó; para probar exactamente esa fecha se necesita actualizar Wrangler.

## Estado comprobado el 16 de octubre de 2026

- Las 15 migraciones existentes se aplicaron desde cero en una base aislada.
- La carga inicial produjo 8 plantas, 12 filas de unidades, 11 recorridos,
  16 medios, 4 caras, 1 colección y 77 puntos del mapa.
- La carga repetida preservó el estado modificado de una unidad y el administrador.
- El build de Next.js/OpenNext y TypeScript finalizaron correctamente.
- Los archivos nuevos y la lógica de autenticación pasan ESLint. El chequeo de
  todos los archivos tocados encuentra cuatro usos de `any` preexistentes en
  `building.ts` y una advertencia preexistente de `<img>` en el login.
- La sesión autorizada de Cloudflare corresponde a `rvisioon@gmail.com`, cuenta
  `432838854ddeae2316053e34c3948aef`; se recuperó el acceso al proyecto.
- La inicialización segura se ejecutó en producción después de exportar una copia
  privada en `.wrangler/backups/`. Las 15 migraciones ya estaban aplicadas:
  no fue necesario modificar el esquema.
- Producción conserva 8 plantas, 12 filas de unidades, 11 recorridos, 16 medios,
  4 caras, 3 colecciones y 77 puntos del mapa; la validación de relaciones pasó.
- Se creó `Admin` en producción con la contraseña solicitada, almacenada únicamente
  como hash bcrypt, y rol `SUPER_ADMIN` para administrar todo el sitio.
- Los bindings de D1/R2 y los secretos de autenticación existen en Pages.
  La rama de producción es `main` y el build automático usa `npm run pages:build`.
