import { EMPRESAS } from '../../../core/db/data.js';
import { store } from '../../../core/db/store.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { norm } from '../../utils/text.js';
import { icon } from '../../utils/icons.js';
import { h, frag } from '../../utils/dom.js';

/** Buscador global Ctrl+K (paleta de comandos). Lo monta el App Shell una sola vez. */
export class CdeCommand extends HTMLElement {
  items = []; active = 0;
  connectedCallback(){
    this.inp = h('input', { type: 'text', role: 'combobox', autocomplete: 'off', placeholder: 'Buscar empresa o ir a…', aria: { expanded: 'true', controls: 'cmd-list' },
      on: {
        input: () => { this.active = 0; this.render(); },
        keydown: e => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); if (!this.items.length) return; this.active = (this.active + (e.key === 'ArrowDown' ? 1 : -1) + this.items.length) % this.items.length; this.render(); }
          if (e.key === 'Enter'){ e.preventDefault(); this.choose(this.items[this.active]); }
        } } });
    this.list = h('ul', { id: 'cmd-list', role: 'listbox', on: { click: e => { const li = e.target.closest('li[data-i]'); if (li) this.choose(this.items[+li.dataset.i]); } } });
    this.dlg = h('dialog', { class: 'cmd', aria: { label: 'Buscar empresa o ir a una pantalla' }, on: { click: e => { if (e.target === this.dlg) this.dlg.close(); } } },
      h('div', { class: 'cmd-in' }, icon('search', 18), this.inp, h('kbd', { text: 'Esc' })),
      this.list,
      h('p', { class: 'cmd-hint small muted', text: '↑ ↓ para moverte · Enter para abrir' }));
    this.replaceChildren(this.dlg);
    this._k = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); this.dlg.open ? this.dlg.close() : this.open(); } };
    this._s = () => this.open();
    document.addEventListener('keydown', this._k); document.addEventListener('cde:search', this._s);
  }
  disconnectedCallback(){ document.removeEventListener('keydown', this._k); document.removeEventListener('cde:search', this._s); }
  open(){ if (this.dlg.open || store.get().role === 'emp') return; this.inp.value = ''; this.active = 0; this.render(); this.dlg.showModal(); this.inp.focus(); }
  choose(it){ if (!it) return; this.dlg.close(); go(it.to, it.query); }
  /** Ítem de resultado de la paleta (construido con h()) */
  item(it, n){
    return h('li', { role: 'option', id: 'cmd-' + n, dataset: { i: n }, aria: { selected: n === this.active } },
      h('span', { class: 'it' }, icon(it.i, 16)), h('span', {}, h('b', { text: it.t }), h('small', { text: it.s })));
  }
  render(){
    const q = norm(this.inp.value);
    const acciones = [
      { t: 'Planes de acción vencidos', s: 'Kanban de intervenciones', i: 'clip', to: '/intervenciones', query: { filtro: 'vencidos' } },
      { t: 'Directorio de empresas', s: 'Todas las empresas', i: 'building', to: '/empresas' },
      ...(store.get().role === 'dir' ? [{ t: 'Automatizaciones', s: 'Reglas CUANDO → SI → ENTONCES', i: 'zap', to: '/automatizaciones' }] : [])
    ].filter(a => !q || norm(a.t).includes(q));
    const emps = EMPRESAS.filter(e => !q || norm(e.nombre + ' ' + e.sector).includes(q)).slice(0, 6)
      .map(e => ({ t: e.nombre, s: e.sector + ' · Expediente 360°', i: 'building', to: '/empresas/' + e.id }));
    this.items = [...emps, ...acciones];
    const rows = this.items.map((it, n) => this.item(it, n));
    this.list.replaceChildren(frag(rows.length ? rows : h('li', { class: 'cmd-empty', text: 'Sin resultados' })));
    this.inp.setAttribute('aria-activedescendant', this.items.length ? 'cmd-' + this.active : '');
  }
}
