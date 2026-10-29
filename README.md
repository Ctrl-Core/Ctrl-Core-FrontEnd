# CDE UNAB · ctrl-core-frontend

SPA en **Vanilla JS + Web Components nativos + CSS puro**, organizada con **Arquitectura Hexagonal** y **Screaming Architecture**. Sin frameworks ni build.

## Ejecutar
Los módulos ES requieren un servidor estático. Para que el Service Worker (`public/sw.js`) controle toda la app el servidor debe enviar `Service-Worker-Allowed: /` en ese archivo:

    python3 - <<'PY'
    import http.server, socketserver
    class H(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            if self.path.endswith('public/sw.js'): self.send_header('Service-Worker-Allowed', '/')
            super().end_headers()
    socketserver.TCPServer(('127.0.0.1', 8765), H).serve_forever()
    PY
    # abrir http://127.0.0.1:8765/

Con `python3 -m http.server` la app funciona igual; solo falla (sin romper nada) el registro del Service Worker.

## Capas y regla de dependencias
    modules/  (dominio)  →  shared/ (puertos de UI)  →  core/ (adaptadores)
    app.js (composition root) es el único que conoce las tres.

| Capa | Contenido | Puede importar |
|---|---|---|
| `src/core/` | `api/` cliente HTTP · `db/` store, IndexedDB, datos · `router/` enrutador por hash | `shared/utils/dom.js` (solo `toast`) |
| `src/shared/` | `styles/` · `utils/` (dom, icons, text, dates) · `components/` reutilizables sin lógica de negocio | `core/` |
| `src/modules/<dominio>/` | `views/` (una pantalla = un Web Component), `services/` (reglas de negocio sin DOM) | `shared/`, `core/` y servicios de otros módulos |
| `src/app.js` | registra componentes, declara rutas, arranca el router | todo |

El router **no** importa módulos: `app.js` le inyecta la tabla de rutas, el outlet y las funciones de rol.

## Estándar de seguridad (OWASP / ISO 25010)
- **Cero** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, atributos `on*` ni `<template>` en el HTML. Todo nodo nace en `shared/utils/dom.js` (`h()`, `svg()`, `frag()`).
- `h()` lanza error si se intenta `on*`, `innerHTML`, `srcdoc` o URLs `javascript:`/`data:`.
- CSP en `index.html` sin `unsafe-inline`; estilos dinámicos por CSSOM.
- `core/api/httpClient.js` solo acepta rutas relativas al `baseUrl`. `sdui-renderer` valida JSON del servidor contra listas blancas.
- Auditoría (debe salir vacía salvo la mención en `dom.js`):

      grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|\bon(click|input|change|submit)=" index.html src public | grep -v "shared/utils/dom.js"

## Agregar una pantalla
1. Crear `src/modules/<dominio>/views/xxxView.js` con `export class XxxView extends CdeView` (sin llamar a `define`).
2. En `src/app.js`: importarla, añadirla a `COMPONENTS` y agregar una línea en `ROUTES`.
El shell, el sidebar y la topbar no se tocan: las vistas solo rellenan el `<main id="outlet">`.

## Pantallas pendientes (sin código en el origen)
`/login` (auth) está en `PLANNED` de `app.js`: el router avisa en vez de romperse. Al construirlas, pasan a `ROUTES`.

## Reiniciar la demo
`localStorage.removeItem('cde.state.v1')`

## Emprendedor (se construye una pantalla a la vez)
| Pantalla | Ruta | Estado |
|---|---|---|
| Mi empresa (en móvil "Mi ruta") | `/mi-empresa` | ✅ `modules/emprendedor/views/myCompanyView.js` |
| Academia | `/academia` | ✅ `modules/emprendedor/views/academyView.js` |
| Mis citas / eventos | `/agenda` (rol `emp`) | ✅ `modules/agenda/views/myAppointmentsView.js` |

**Mi empresa**
- `modules/emprendedor/services/gamificacion.js` (sin DOM): nivel por XP (avance contra el umbral del siguiente nivel: 1.450 / 2.000 = 72 %), medallas **calculadas** (no se regalan) y `sumarXp()` (enteros 1–1.000, con motivo auditable). La usarán Academia y el check-in.
- `shared/components/gamification/level-card.js`: tarjeta de nivel/racha/XP/medallas **sin lógica de negocio** (recibe datos ya calculados); se reutiliza en Academia.
- Plan de acción y próxima asesoría salen de `planes.js` y `citas.js` (`proximaDe`): una sola fuente de verdad con el Kanban y la Agenda.
- **Shell:** el Emprendedor ve la píldora "Racha · XP" y su avatar (MR), sin buscador (Ctrl+K ya está bloqueado para `emp`). En tablet el menú lleva etiquetas cortas y en móvil hay barra de pestañas inferior (Mi ruta · Academia · Citas); el dock de rol queda flotante.
- **Router (genérico):** nuevos campos de ruta `guard`/`guardMsg` y `parents`. El Emprendedor solo abre `/empresas/e101` (su expediente) y su miga de pan vuelve a "Mi empresa".
- `core/db/perfil.js`: accesor del perfil para que `shared/` (shell) no dependa de `modules/`.

**Academia** (`/academia`, solo Emprendedor)
- **Servicio:** `modules/emprendedor/services/academia.js` (sin DOM). Reutiliza `gamificacion.js` (nivel, medallas, `sumarXp`), `expedientes.js` (radar) y el directorio (ficha).
- **Misiones por pasos:** `leer` (se confirma) o `quiz` (exige la opción correcta). Estado derivado: Bloqueada (nivel) · Disponible · En progreso · Completada. El XP se otorga **una sola vez** al completar (`cobrada`) y avisa si subes de nivel.
- **Recomendada:** la misión disponible cuyo área coincide con la **mayor brecha del radar** de la empresa (reglas locales, sin servicio externo).
- **Reto semanal:** progreso = salud de la ficha; el bono (+200 XP) se cobra una vez, solo si se cumple la meta y no venció. El tiempo restante se calcula contra `AHORA` (constante de la demo).
- **Canje:** se paga con **saldo** (XP total − XP canjeado), así el nivel nunca baja. Requiere nivel mínimo y saldo suficiente; cada recompensa se canjea una vez. `RECOMPENSAS` es configurable en `core/db/data.js` (la segunda es de ejemplo).
- **Componentes compartidos nuevos** (sin lógica de negocio): `level-steps.js`, `medal-grid.js`, `mission-row.js`; la tarjeta de nivel es la misma de Mi empresa (`level-card.js`).
- `CdeView.dialog()` acepta una etiqueta opcional para el botón de envío (por defecto "Guardar").

**Mis citas y eventos** (`/agenda` para el rol `emp`, `view-mis-citas`)
- Misma ruta que Director y Docente; el router monta la vista según el rol (`tags`/`titles`). Ya no hay `soon` para `emp`.
- **Próxima asesoría:** la vigente de SU empresa (`proximaDe`). **Una sola asesoría vigente a la vez**: para pedir otra hay que reprogramar o cancelar. Pedir (`solicitar`) nace *Pendiente*; **reprogramar** exige un día de anticipación, sin cruces, y vuelve a *Pendiente* para que el asesor confirme.
- **Mis eventos:** eventos publicados (no borradores) con su inscripción (`misEventos`). Puede **inscribirse** (evento confirmado, futuro, con cupo) y **cancelar** la inscripción mientras esté *Inscrito*.
- **QR de check-in:** aparece solo si hay un evento confirmado y futuro con inscripción vigente. Cuando el Director "escanea" (`simularCheckin`) y la persona es el Emprendedor de la demo, se otorgan **+50 XP al instante** (`sumarXp`).
- **Mis asesorías:** todas sus citas con el acta (acuerdos y próximo paso) en un `<details>`; **Historial con el CDE:** el timeline del Expediente (incluye las actas).
- Reutiliza `statusBadge`, `timeline`, `xpText`, `qrDemo`, `CdeView.dialog` y el nuevo `shared/components/date-badge.js`.
- Datos: se agregó el evento pasado `ev0` (taller de mayo, asistió) y María Rojas queda *Inscrita* en `ev1` (24 nov).

## Integración con el backend (FrontEnd_Integración.pdf)
- **Config:** `core/api/apiConfig.js` (`baseUrl` Core :3000, `aiBaseUrl` IA :8000, `tenantId`). Ambos orígenes están en `connect-src` de `index.html`. Con proxy mismo origen, usar `/api/v1` y `/api/ai` y quitarlos del CSP.
- **Cliente:** `core/api/httpClient.js` exporta `http` (Core) y `httpAi` (IA). Envía `x-tenant-id`, o `Authorization: Bearer` si hay `token` en el store.
- **Adaptador:** `core/api/contrato.js` traduce el JSON del contrato a las formas de `data.js` y las rellena **en sitio** (los consumidores no cambian de import). Ids: `empresa_id 1` ⇄ `'e1'`.
- **Vistas:** una vista declara `load()` (y opcional `loaded()`); `CdeView` la ejecuta tras el primer pintado y repinta.

| Pantalla | Llamada |
|---|---|
| Directorio | `GET /empresas` · IA `POST /empresas/check-duplicate` (al escribir el nombre, solo Director) |
| Expediente 360° | `GET /empresas/:id/expediente-360` |
| Centro de mando | `GET /analytics/dashboard-bi` (incluye tarjeta Plan de acción 2026) |
| Planes (Kanban) | `GET /intervenciones/kanban` · `PATCH …/:id/move` (revierte si falla) · IA `POST /planes/generate` ("Sugerir con IA" en Nuevo plan) |

Sin servidor, las vistas siguen con los datos de `data.js` y se avisa una sola vez. El SW no cachea rutas `/api/`.
