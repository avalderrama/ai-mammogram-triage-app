# ai-mammogram-triage-app

App web instalable (PWA) de prueba para médicos: se fotografía una mamografía en pantalla o en placa y la app
pide al servidor MCP [`ai-mammogram-triage`](../ai-mammogram-triage) un **nivel de prioridad por mama**
(alta prioridad, revisar o sin hallazgos sospechosos), con probabilidades por grupo BI-RADS, avisos de calidad
de la foto y, si la resolución lo permite, un mapa de calor.

> ⚠️ **Herramienta de investigación.** No es un dispositivo médico y nunca sustituye la lectura del radiólogo.

## Privacidad

- La imagen se queda **solo en memoria** mientras la app está abierta: no se guarda en `localStorage`,
  IndexedDB ni en la caché del *service worker*. Al pulsar «Analizar otra imagen» se descarta.
- El servidor tapa los datos personales visibles en la imagen antes de analizarla y tampoco la guarda.
- La **clave de acceso** se guarda solo en memoria; si marcas «Recordar la clave mientras esta pestaña esté
  abierta», va a `sessionStorage` y se borra al cerrar la pestaña. Nunca va a `localStorage` ni a la URL.
- Solo se aceptan servidores `https://` (o `http://127.0.0.1` / `localhost` para pruebas locales).

## Uso

1. Arranca el servidor MCP (ver su README) con `MAMMO_ALLOWED_ORIGINS` incluyendo el origen de esta app.
2. Abre la app, ve a **Ajustes** y escribe la dirección del servidor (termina en `/mcp`) y la clave.
3. **Tomar foto** o **Elegir imagen guardada** → revisa la imagen (opcionalmente indica cuántas vistas hay y
   la mama/proyección de cada una) → **Analizar imagen**.

## Desarrollo

Requiere Node 22.

```bash
npm ci
```

```bash
npm run dev
```

La app queda en `http://127.0.0.1:5173`. Comprobaciones (Definition of Done):

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

Las pruebas incluyen revisión de accesibilidad con axe-core en cada vista. Para la versión de producción
(con política de seguridad de contenido y *service worker*):

```bash
npm run build
```

```bash
npm run preview
```

`VITE_DEFAULT_SERVER_URL` (ver `.env.example`) fija la dirección del servidor que aparece por defecto en
Ajustes. Queda dentro del paquete publicado, así que no ponga ahí la dirección de un túnel privado. La clave
nunca se configura por variables de entorno.

Al publicar `dist/` (por ejemplo en GitHub Pages o detrás de un proxy), publique solo una compilación limpia y,
si el alojamiento lo permite, añada las cabeceras `Content-Security-Policy: frame-ancestors 'none'` y
`X-Content-Type-Options: nosniff` (la política de la etiqueta `<meta>` no puede impedir que la app se incruste
en otra página).

## Arquitectura

Arquitectura de cebolla adaptada al frontend; las dependencias solo apuntan hacia dentro y ESLint lo comprueba
(`no-restricted-imports` por carpeta):

| Carpeta | Contenido | Puede importar |
|---|---|---|
| `src/domain` | Modelo del resultado y reglas puras (orden por urgencia, resultado parcial) | nada |
| `src/application` | Casos de uso (`analyzeMammogram`, ajustes de conexión), puertos y errores | `domain` |
| `src/infrastructure` | Cliente MCP (carga diferida del SDK), validación de la respuesta con zod, preparación de la imagen, ajustes del navegador, *service worker* | `application`, `domain` |
| `src/presentation` | Componentes React, textos, tokens de diseño | `application`, `domain` |
| `src/main.tsx` | Punto de composición | todo |

## Diseño

Sigue las reglas de diseño UI/UX del equipo: tokens semánticos con tema claro y oscuro, mobile-first
(sin desplazamiento horizontal desde 320 px), nivel con ícono + texto + color, cinco estados por vista
(carga, vacío, error, parcial y con datos), errores con salida y código de referencia, enlace para saltar al
contenido, foco gestionado al cambiar de vista, regiones vivas para mensajes, `prefers-reduced-motion` y
botón Atrás funcional (rutas con `#`).
