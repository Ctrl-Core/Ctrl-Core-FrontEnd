/**
 * PUNTO DE ENTRADA · composition root.
 *
 * Es el único lugar que conoce a la vez la infraestructura (core), los componentes compartidos (shared)
 * y los módulos de dominio (modules). Hace tres cosas:
 *   1. Registra los Web Components (cada archivo exporta su clase; aquí se decide el nombre de la etiqueta).
 *   2. Declara la tabla de rutas = mapa de pantallas del producto.
 *   3. Arranca el router inyectándole el outlet del App Shell y las funciones de rol.
 */
import { store } from './core/db/store.js';
import { ROLES, USUARIO_EMPRENDEDOR } from './core/db/data.js';
import { router } from './core/router/vanillaRouter.js';

// Shared · App Shell
import { CdeAppShell } from './shared/components/app-shell/cde-app-shell.js';
import { CdeCommand } from './shared/components/app-shell/cde-command.js';
import { CdeRoleSwitch } from './shared/components/app-shell/cde-role-switch.js';

// Módulos de dominio (Screaming Architecture): una vista por pantalla
import { SetupView } from './modules/onboarding/views/setupView.js';
import { DashboardView } from './modules/dashboard/views/dashboardView.js';
import { DirectoryView } from './modules/empresas/views/directoryView.js';
import { Dossier360View } from './modules/empresas/views/dossier360View.js';
import { KanbanView } from './modules/intervenciones/views/kanbanView.js';
import { EventsHubView } from './modules/agenda/views/eventsHubView.js';
import { AdvisoriesView } from './modules/agenda/views/advisoriesView.js';
import { MyAppointmentsView } from './modules/agenda/views/myAppointmentsView.js';
import { CanvasView } from './modules/automatizaciones/views/canvasView.js';
import { MyCompanyView } from './modules/emprendedor/views/myCompanyView.js';
import { AcademyView } from './modules/emprendedor/views/academyView.js';

/* ───────────── 1. Registro de Web Components ─────────────
 * Orden: primero las hojas (command, role-switch), luego el shell que las contiene y al final las vistas. */
const COMPONENTS = [
  ['cde-command', CdeCommand],
  ['cde-role-switch', CdeRoleSwitch],
  ['cde-app-shell', CdeAppShell],
  ['view-setup', SetupView],
  ['view-dashboard', DashboardView],
  ['view-empresas', DirectoryView],
  ['view-expediente', Dossier360View],
  ['view-intervenciones', KanbanView],
  ['view-agenda', EventsHubView],
  ['view-asesorias', AdvisoriesView],
  ['view-mis-citas', MyAppointmentsView],
  ['view-automatizaciones', CanvasView],
  ['view-mi-empresa', MyCompanyView],
  ['view-academia', AcademyView]
];
for (const [tag, cls] of COMPONENTS) customElements.get(tag) || customElements.define(tag, cls);

/* ───────────── 2. Tabla de rutas ─────────────
 * Para sumar una pantalla: crear su vista en modules/<dominio>/views, exportarla, registrarla arriba
 * y agregar una línea aquí. El shell, el sidebar y la topbar no se tocan. */
const ROUTES = [
  { path: '/dashboard', tag: 'view-dashboard', title: 'Centro de mando', chrome: 'app', roles: ['dir'] },
  { path: '/empresas', tag: 'view-empresas', title: 'Directorio de empresas', crumb: 'Empresas', chrome: 'app', roles: ['dir', 'doc'] },
  { path: '/empresas/:id', tag: 'view-expediente', title: 'Expediente 360°', parent: ['Empresas', '#/empresas'], parents: { emp: ['Mi empresa', '#/mi-empresa'] }, chrome: 'app', roles: ['dir', 'doc', 'emp'],
    guard: ({ role, params }) => role !== 'emp' || params.id === USUARIO_EMPRENDEDOR.empresaId, guardMsg: 'Solo puedes ver el expediente de tu empresa' },
  { path: '/mi-empresa', tag: 'view-mi-empresa', title: 'Mi empresa', chrome: 'app', roles: ['emp'] },
  { path: '/academia', tag: 'view-academia', title: 'Academia', chrome: 'app', roles: ['emp'] },
  { path: '/intervenciones', tag: 'view-intervenciones', title: 'Planes de acción', crumb: 'Intervenciones', chrome: 'app', roles: ['dir', 'doc'] },
  { path: '/agenda', tag: 'view-agenda', tags: { dir: 'view-agenda', doc: 'view-asesorias', emp: 'view-mis-citas' },
    title: 'Agenda y eventos', titles: { dir: 'Agenda y eventos', doc: 'Agenda · Asesorías', emp: 'Mis citas y eventos' },
    chrome: 'app', roles: ['dir', 'doc', 'emp'] },
  { path: '/automatizaciones', tag: 'view-automatizaciones', title: 'Automatizaciones', chrome: 'app', roles: ['dir'] },
  { path: '/setup', tag: 'view-setup', title: 'Asistente de configuración', chrome: 'bare', note: 'Solo en el primer uso', roles: ['dir'] }
];

/** Pantallas diseñadas pero sin código todavía: el router avisa en lugar de romperse. Al construirlas, pasan a ROUTES. */
const PLANNED = ['/login'];

/* ───────────── 3. Arranque ───────────── */
const shell = document.querySelector('cde-app-shell');
if (!shell?.outlet) throw new Error('[app] <cde-app-shell> no está en index.html o no expone su outlet');

router.start({
  routes: ROUTES,
  planned: PLANNED,
  outlet: shell.outlet,
  getRole: () => store.get().role,
  homeFor: () => ROLES[store.get().role].home,
  onChange: route => shell.update(route)
});

/* ───────────── PWA ─────────────
 * sw.js vive en /public, pero necesita controlar toda la app: el servidor debe enviar la cabecera
 * `Service-Worker-Allowed: /` para ese archivo. Si falta (o sw.js aún no existe) el registro falla sin romper la app. */
if ('serviceWorker' in navigator) {
  addEventListener('load', async () => {
    try {
      const root = new URL('../', import.meta.url);
      await navigator.serviceWorker.register(new URL('public/sw.js', root), { scope: root.pathname });
    } catch (err) {
      console.warn('[sw] No se registró el Service Worker:', err.message);
    }
  });
}
