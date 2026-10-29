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
`/login` (auth), `/mi-empresa` y `/academia` (emprendedor) están en `PLANNED` de `app.js`: el router avisa en vez de romperse. Al construirlas, pasan a `ROUTES`.

## Reiniciar la demo
`localStorage.removeItem('cde.state.v1')`
