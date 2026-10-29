import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { DIRECTORIO, SECTORES, FILTROS_ESTADO, TOTALS } from '../../../core/db/data.js';
import { store } from '../../../core/db/store.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { norm, fmt } from '../../../shared/utils/text.js';
import { icon } from '../../../shared/utils/icons.js';
import { h, frag, toast } from '../../../shared/utils/dom.js';
import { similar } from '../services/duplicados.js';
import { hidratarEmpresas, nombreSector, verificarDuplicado } from '../../../core/api/contrato.js';

const UMBRAL_DUP = 0.7; // similitud mínima para avisar "¿Quisiste decir…?"

/**
 * P3 · Directorio de empresas. Búsqueda con guardián antiduplicados, filtros por estado / comunidad UNAB / sector
 * (también desde la URL: /empresas?sector=alimentos&origen=unab) y tabla con salud de ficha.
 * render() arma el esqueleto UNA vez (el input conserva el foco al escribir); paint() solo repinta alerta, chips y filas.
 */
export class DirectoryView extends CdeView {
  text = ''; filtro = 'Todas'; sector = null;

  bind(){
    const q = this.q;
    this.text = q.q || '';
    this.sector = q.sector || null;
    this.filtro = q.origen === 'unab' ? 'Comunidad UNAB' : FILTROS_ESTADO.includes(q.estado) ? q.estado : 'Todas';
  }
  get merged(){ return store.get().fusionadas ?? []; }
  get puedeCrear(){ return store.get().role === 'dir'; }
  label(id){ return nombreSector(id); }
  load(){ return hidratarEmpresas(true); }
  cleanup(){ clearTimeout(this._tIA); }
  /** Guardián de la IA (FastAPI): consulta con pausa de 400 ms mientras se escribe el nombre */
  verificarIA(){
    clearTimeout(this._tIA); this.dupIA = null;
    if (norm(this.text).length < 4 || !this.puedeCrear) return;
    this._tIA = setTimeout(async () => {
      const sector = this.sector && this.sector !== 'sin-sector' ? nombreSector(this.sector) : '';
      const r = await verificarDuplicado({ razon_social: this.text.trim(), sector, municipio: '' });
      if (this.isConnected && r){ this.dupIA = r; this.paint(); }
    }, 400);
  }
  alertIA(){
    const m = this.dupIA?.is_duplicate_risk ? this.dupIA.matches?.[0] : null; if (!m) return null;
    const id = m.empresa_id ?? m.id, nombre = m.nombre ?? m.nombre_comercial ?? m.razon_social ?? 'una empresa existente';
    return h('div', { class: 'alert dup', role: 'status' },
      h('span', { class: 'ico' }, icon('alert', 15)),
      h('div', { class: 'txt' }, 'La IA detecta riesgo de duplicado: ', h('b', { text: nombre }), '.'),
      id != null ? h('button', { class: 'btn o', type: 'button', text: 'Abrir ficha', on: { click: () => go('/empresas/' + (String(id).startsWith('e') ? id : 'e' + id)) } }) : null);
  }

  /** Filas visibles según texto + filtro + sector (las fichas ya fusionadas se ocultan) */
  filtered(){
    const n = norm(this.text);
    return DIRECTORIO.filter(e => !this.merged.includes(e.id))
      .filter(e => !n || norm(e.nombre).includes(n) || similar(this.text, e.nombre) >= UMBRAL_DUP)
      .filter(e => this.filtro === 'Todas' || (this.filtro === 'Comunidad UNAB' ? e.unab : e.estado === this.filtro))
      .filter(e => !this.sector || (this.sector === 'sin-sector' ? !e.sectorId : e.sectorId === this.sector));
  }
  /** Guardián antiduplicados: ficha canónica parecida a lo escrito (sin avisar mientras se escribe el prefijo exacto) */
  suggestion(){
    const raw = this.text.trim(), n = norm(raw); if (n.length < 4) return null;
    let best = null, top = 0;
    for (const e of DIRECTORIO.filter(x => !x.dupDe)){
      const s = similar(raw, e.nombre), en = norm(e.nombre);
      if (en !== n && !en.startsWith(n) && s >= UMBRAL_DUP && s > top){ best = e; top = s; }
    }
    return best;
  }
  merge(dup, canon){
    if (!confirm(`¿Fusionar “${dup.nombre}” con “${canon.nombre}”? Se conservará la ficha de “${canon.nombre}”.`)) return;
    store.set({ fusionadas: [...this.merged, dup.id] });
    toast(`Fichas fusionadas: se conserva “${canon.nombre}”`);
    this.paint();
  }
  clear(){ this.filtro = 'Todas'; this.sector = null; this.text = ''; this.$input.value = ''; this.paint(); }

  alertNode(){
    const canon = this.suggestion(); if (!canon) return this.alertIA();
    const dup = DIRECTORIO.find(e => e.dupDe === canon.id && !this.merged.includes(e.id) && norm(e.nombre) === norm(this.text));
    return h('div', { class: 'alert dup', role: 'status' },
      h('span', { class: 'ico' }, icon('alert', 15)),
      h('div', { class: 'txt' }, '¿Quisiste decir ', h('b', { text: canon.nombre }), '? Evita crear un duplicado.'),
      dup ? h('button', { class: 'btn', type: 'button', text: 'Fusionar', on: { click: () => this.merge(dup, canon) } })
          : h('button', { class: 'btn o', type: 'button', text: 'Abrir ficha', on: { click: () => go('/empresas/' + canon.id) } }));
  }
  chipNodes(){
    const chips = FILTROS_ESTADO.map(f => h('button', { class: 'chip', type: 'button', text: f, aria: { pressed: this.filtro === f },
      on: { click: () => { this.filtro = f; this.paint(); } } }));
    if (this.sector) chips.push(h('button', { class: 'chip', type: 'button', aria: { pressed: 'true', label: 'Quitar filtro de sector' },
      on: { click: () => { this.sector = null; this.paint(); } } }, `Sector: ${this.label(this.sector === 'sin-sector' ? null : this.sector)}`, icon('x', 12)));
    return chips;
  }
  /** Fila de la tabla (role=row) */
  rowNode(e){
    return h('div', { class: ['tr', 'dir-row', e.dupDe && 'dup'], role: 'row' },
      h('div', { class: 'dir-name', role: 'cell' }, h('b', { text: e.nombre }), ' ', h('span', { class: 'badge', hidden: !e.unab, text: 'UNAB' }), ' ',
        h('small', { class: 'muted', hidden: !e.dupDe, text: '· posible duplicado' })),
      h('div', { class: 'col-sector', role: 'cell', text: this.label(e.sectorId) }),
      h('div', { class: 'dir-health', role: 'cell' }, meterBar(e.salud), h('b', { text: e.salud + '%' })),
      h('div', { class: 'dir-estado', role: 'cell' }, statusBadge(e.estado)),
      h('div', { class: 'dir-ver', role: 'cell' }, h('a', { class: 'link-ver', href: '#/empresas/' + e.id, aria: { label: 'Ver ' + e.nombre }, text: 'Ver' })));
  }
  paint(){
    const list = this.filtered(), a = this.alertNode();
    this.$alert.replaceChildren(...(a ? [a] : []));
    this.$chips.replaceChildren(...this.chipNodes());
    this.$rows.replaceChildren(list.length ? frag(list.map(e => this.rowNode(e)))
      : h('div', { class: 'dir-empty' }, h('p', { text: 'No hay empresas que coincidan. Prueba con otro nombre o quita los filtros.' }),
          h('button', { class: 'btn o', type: 'button', text: 'Limpiar filtros', on: { click: () => this.clear() } })));
    this.$live.textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
  }

  render(){
    this.$input = h('input', { id: 'dir-q', class: 'field', type: 'text', autocomplete: 'off', placeholder: 'Nombre de la empresa', value: this.text,
      on: { input: e => { this.text = e.target.value; this.paint(); this.verificarIA(); } } });
    this.$alert = h('div'); this.$chips = h('div', { class: 'chips', role: 'group', aria: { label: 'Filtrar por estado' } });
    this.$rows = h('div', { role: 'rowgroup' });
    this.$live = h('p', { class: 'sr-only', aria: { live: 'polite' } });
    const root = h('div', { class: 'dir' },
      h('header', { class: 'page-h' },
        h('div', {}, h('h1', { text: 'Directorio de empresas' }), h('p', { text: `${fmt(TOTALS.unicas)} empresas únicas` })),
        this.puedeCrear ? h('button', { class: 'btn', type: 'button', on: { click: () => { this.$input.focus(); toast('Escribe el nombre: te avisaremos si ya existe una ficha parecida'); } } }, icon('plus', 16), ' Nueva empresa') : null),
      h('section', { class: 'card dir-tools', aria: { label: 'Buscar y filtrar' } },
        h('div', { class: 'dir-search', role: 'search' }, h('label', { class: 'sr-only', for: 'dir-q', text: 'Buscar empresa por nombre' }), icon('search', 18), this.$input),
        this.$alert, this.$chips),
      h('section', { class: 'card dir-table', aria: { label: 'Directorio de empresas' } },
        h('div', { role: 'table', aria: { label: 'Empresas' } },
          h('div', { class: 'tr th dir-head', role: 'row' },
            h('div', { role: 'columnheader', text: 'Empresa' }), h('div', { role: 'columnheader', text: 'Sector' }),
            h('div', { role: 'columnheader', text: 'Salud de ficha' }), h('div', { role: 'columnheader', text: 'Estado' }),
            h('div', { role: 'columnheader' }, h('span', { class: 'sr-only', text: 'Acciones' }))),
          this.$rows), this.$live));
    this.paint();
    return root;
  }
}
