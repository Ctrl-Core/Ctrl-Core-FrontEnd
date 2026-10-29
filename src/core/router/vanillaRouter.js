/**
 * ADAPTADOR · Router por hash (#/ruta?query).
 *
 * Es genérico a propósito: NO importa módulos de dominio ni el store. La tabla de rutas, el outlet y las
 * funciones de rol se inyectan desde app.js (composition root) con router.start({...}). Así `core/` nunca
 * depende de `modules/` y agregar una pantalla no obliga a tocar este archivo.
 *
 * Definición de ruta:
 *   { path, tag, title, chrome, roles?, soon?, tags?, titles?, crumb?, parent?, note? }
 *   - tag / tags[rol]  : etiqueta del Web Component que se monta (tags permite una vista distinta por rol)
 *   - roles            : roles con acceso (si se omite, acceso libre)
 *   - soon             : roles cuya vista aún no existe → aviso "se construye en el siguiente paso"
 *   - chrome           : 'bare' (solo topbar) | 'app' (sidebar + topbar), lo consume el App Shell
 */
import { toast } from '../../shared/utils/dom.js';

const MSG_SOON = 'Esa pantalla se construye en el siguiente paso del proyecto';
const MSG_DENIED = 'Tu rol no tiene acceso a esa vista';

const state = {
  routes: [], planned: [], outlet: null, onChange: null,
  getRole: () => null, homeFor: () => '/',
  lastHash: null, listener: null
};

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compile = path => new RegExp('^' + escapeRe(path).replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };

/** Lee location.hash → { path, query }. Normaliza la barra final ("/empresas/" → "/empresas"). */
function parseHash() {
  const [raw, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') || '/' : raw;
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

function matchRoute(path) {
  for (const def of state.routes) {
    const m = def.re.exec(path);
    if (m) return { def, params: Object.fromEntries(Object.entries(m.groups ?? {}).map(([k, v]) => [k, safeDecode(v)])) };
  }
  return null;
}

/** Navega por hash. go('/intervenciones', { filtro: 'vencidos' }) */
export const go = (path, query) => {
  const qs = query ? new URLSearchParams(query).toString() : '';
  location.hash = '#' + path + (qs ? '?' + qs : '');
};
/** ¿La ruta está registrada? (lo usa el conmutador de rol para avisar de vistas pendientes) */
export const exists = path => state.routes.some(r => r.re.test(path));
/** Ruta de inicio del rol activo */
export const home = () => state.homeFor();

export const router = {
  /**
   * @param {object}   cfg
   * @param {Array}    cfg.routes    tabla de rutas (ver definición arriba)
   * @param {string[]} [cfg.planned] prefijos de pantallas diseñadas pero sin construir (aviso en vez de error)
   * @param {Element}  cfg.outlet    contenedor donde se monta la vista (el <main> del App Shell)
   * @param {Function} cfg.getRole   () => rol activo
   * @param {Function} cfg.homeFor   () => ruta de inicio del rol activo
   * @param {Function} [cfg.onChange] (route) => void, se llama tras cada navegación
   */
  start({ routes, planned = [], outlet, getRole, homeFor, onChange }) {
    if (!outlet) throw new Error('[router] Falta el outlet donde montar las vistas');
    router.stop();
    Object.assign(state, {
      routes: routes.map(r => ({ ...r, re: compile(r.path) })),
      planned, outlet, getRole, homeFor, onChange, lastHash: null
    });
    state.listener = () => router.resolve();
    addEventListener('hashchange', state.listener);
    router.resolve();
  },

  stop() {
    if (state.listener) removeEventListener('hashchange', state.listener);
    state.listener = null;
  },

  /** Vuelve a la URL anterior sin recargar ni remontar la vista (replaceState no dispara hashchange) */
  stay() {
    if (state.lastHash) history.replaceState(null, '', state.lastHash);
    else go(home());
  },

  resolve() {
    const { path, query } = parseHash();
    if (path === '/') return go(home());

    const match = matchRoute(path);
    if (!match) {
      if (state.planned.some(p => path === p || path.startsWith(p + '/'))) { toast(MSG_SOON); return router.stay(); }
      return go(home());
    }

    const role = state.getRole();
    const { def: base, params } = match;
    if (base.roles && !base.roles.includes(role)) {
      toast(base.soon?.includes(role) ? MSG_SOON : MSG_DENIED);
      return router.stay();
    }

    // Una misma ruta puede montar vistas distintas según el rol (p. ej. /agenda: Director vs. Docente)
    const def = { ...base, tag: base.tags?.[role] ?? base.tag, title: base.titles?.[role] ?? base.title };
    if (!customElements.get(def.tag)) {
      console.error(`[router] El componente <${def.tag}> no está registrado (revisar app.js)`);
      toast('Esta vista no está disponible');
      return router.stay();
    }

    const el = document.createElement(def.tag);
    el.route = { path, params, query, def };   // se asigna ANTES de conectar: connectedCallback ya lo ve
    state.outlet.replaceChildren(el);
    state.lastHash = location.hash;
    document.title = `${def.title} · CDE UNAB`;
    scrollTo(0, 0);
    state.onChange?.(el.route);
    state.outlet.focus({ preventScroll: true });
  }
};
