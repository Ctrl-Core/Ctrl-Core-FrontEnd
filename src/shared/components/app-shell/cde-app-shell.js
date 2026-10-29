import { store } from '../../../core/db/store.js';
import { ROLES } from '../../../core/db/data.js';
import { icon } from '../../utils/icons.js';
import { h } from '../../utils/dom.js';

const LOGO = 'public/assets/logo-cde-unab.png';

/**
 * App Shell maestro. Se construye UNA sola vez y contiene topbar, sidebar, dock de rol, avisos (toasts)
 * y el <main id="outlet"> donde el router inyecta cada vista. Árbol 100% programático con h().
 * Las vistas NUNCA repiten sidebar ni topbar. Las etiquetas hijas (cde-command, cde-role-switch) las registra app.js.
 */
export class CdeAppShell extends HTMLElement {
  connectedCallback(){
    const logo = cls => h('img', { class: cls, src: LOGO, alt: 'Centro de Desarrollo Empresarial UNAB' });
    const demo = () => [h('p', { text: 'Modo demostración · cambiar rol' }), h('cde-role-switch')];
    this.replaceChildren(h('div', { class: 'shell', dataset: { chrome: 'bare' } },
      h('aside', { class: 'sb only-app', aria: { label: 'Navegación principal' } },
        h('div', { class: 'brand' }, h('img', { src: LOGO, alt: 'CDE UNAB' })),
        h('nav', { class: 'nav', dataset: { nav: '' } }),
        h('div', { class: 'demo' }, demo())),
      h('div', { class: 'main' },
        h('header', { class: 'top' },
          logo('logo only-bare'),
          h('div', { class: 'crumbs only-app', dataset: { crumbs: '' } }),
          h('span', { class: 'spacer only-bare' }),
          h('span', { class: 'note only-bare', dataset: { note: '' } }),
          h('button', { class: 'search only-app', type: 'button', dataset: { search: '' }, aria: { label: 'Buscar empresa (Ctrl K)' },
            on: { click: () => document.dispatchEvent(new CustomEvent('cde:search')) } },
            h('span', {}, icon('search', 16), ' Buscar empresa…'), h('kbd', { text: 'Ctrl K' })),
          h('div', { class: 'avatar', role: 'img', aria: { label: 'Usuario: JD' }, text: 'JD' })),
        h('main', { id: 'outlet', tabindex: '-1', aria: { live: 'polite' } })),
      h('div', { class: 'dock only-bare' }, demo()),
      h('cde-command'),
      h('div', { class: 'toasts', role: 'status', aria: { live: 'polite' } })));
    this.$ = s => this.querySelector(s);
    this.outlet = this.$('#outlet');
    this._onToast = e => this.toast(e.detail);
    document.addEventListener('cde:toast', this._onToast);
    this._off = store.subscribe(() => this.chrome());
  }
  disconnectedCallback(){ document.removeEventListener('cde:toast', this._onToast); this._off?.(); }
  toast(msg){
    const t = h('div', { class: 'toast', text: msg });
    this.$('.toasts').append(t); setTimeout(() => t.remove(), 3600);
  }
  /** Lo llama el router (vía app.js) en cada navegación */
  update(route){ this.route = route; this.chrome(); }
  chrome(){
    const route = this.route; if (!route) return;
    this.$('.shell').dataset.chrome = route.def.chrome;
    this.$('[data-note]').textContent = route.def.note || '';
    if (route.def.chrome === 'app'){
      const menu = ROLES[store.get().role].menu;
      this.$('[data-nav]').replaceChildren(...menu.map(([p, l, i]) =>
        h('a', { href: '#' + p, aria: { current: route.path === p || route.path.startsWith(p + '/') ? 'page' : null } }, icon(i), h('span', { text: l }))));
      const [pl, ph] = route.def.parent || [];
      this.$('[data-crumbs]').replaceChildren(document.createTextNode('Inicio / '),
        ...(pl ? [h('a', { href: ph, text: pl }), document.createTextNode(' / ')] : []),
        h('b', { text: route.label || route.def.crumb || route.def.title }));
    }
  }
}
