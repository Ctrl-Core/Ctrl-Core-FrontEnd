import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { flowNode, flowArrow, dispatchRow, ruleItem } from '../../../shared/components/automation/rule-flow.js';
import { CUANDO, SI, ENTONCES } from '../../../core/db/data.js';
import { icon } from '../../../shared/utils/icons.js';
import { h, frag, toast } from '../../../shared/utils/dom.js';
import { getReglas, describir, interpretar, crear, cambiarEstado, eliminar, probar, disparos, ejecucionesDe, nombreEmpresa } from '../services/automatizaciones.js';

/**
 * P6 · Automatizaciones (Director): lienzo CUANDO → SI → ENTONCES, asistente de reglas y lista de reglas.
 * Las reglas nuevas nacen en Borrador; solo se activan si son válidas y no equivalentes a otra. Las pruebas son simuladas
 * y los canales externos omiten a empresas sin autorización de datos. La lógica vive en services/automatizaciones.js.
 */
export class CanvasView extends CdeView {
  sel = null; texto = 'Avísame si un plan lleva 7 días vencido'; interp = null;
  bind(){
    const id = this.q.regla;
    this.sel = getReglas().some(r => r.id === id) ? id : getReglas()[0]?.id ?? null;
  }
  get regla(){ return getReglas().find(r => r.id === this.sel) ?? null; }
  accion(fn, ok){ const r = fn(); if (!r.ok){ toast(r.error); return; } toast(ok); this.update(); }

  canvas(){
    const r = this.regla;
    if (!r) return h('section', { class: 'card' }, h('p', { class: 'muted', text: 'Aún no hay reglas. Describe una con el asistente o crea una con “Nueva regla”.' }));
    const d = describir(r), p = disparos(r), n = p.enviables.length;
    const href = '#' + d.cuando.ruta + (d.cuando.query ? '?' + new URLSearchParams(d.cuando.query) : '');
        const resumen = `${n} ${n === 1 ? 'disparo previsto' : 'disparos previstos'}` + (p.omitidas ? ` · ${p.omitidas} omitido${p.omitidas > 1 ? 's' : ''} por falta de autorización de datos` : '') + (p.noCumple ? ` · ${p.noCumple} no cumple${p.noCumple > 1 ? 'n' : ''} la condición` : '');
    const filas = p.items.slice(0, 6).map(i => dispatchRow({ empresa: nombreEmpresa(i.empresaId), detalle: i.detalle, cuando: i.cuando, omitido: i.omitido }));
    const activar = r.estado !== 'Activo';
    return h('section', { class: 'card canvas', aria: { labelledby: 'rg-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'rg-t', style: { font: 'inherit', margin: '0' }, text: `Regla: ${r.nombre}` }), statusBadge(r.estado)),
      h('div', { class: 'flow', role: 'list', aria: { label: 'Flujo de la regla' } },
        flowNode('CUANDO', d.cuando.titulo, h('a', { class: 'badge', href, text: d.cuando.fuente, aria: { label: `Abrir ${d.cuando.fuente}` } })), flowArrow(),
        flowNode('SI', d.si.titulo, h('span', { class: 'badge', text: d.si.fuente })), flowArrow(),
        flowNode('ENTONCES', d.entonces.titulo, h('span', { class: 'badge', text: d.entonces.fuente }), true)),
      h('div', { class: 'alcance' },
        h('p', { aria: { live: 'polite' } }, h('b', { text: 'Alcance estimado: ' }), resumen),
        filas.length ? h('details', { class: 'prev' }, h('summary', { text: 'Ver disparos previstos' }), h('ul', {}, frag(filas))) : null,
        h('div', { class: 'auto-acts' },
          h('button', { class: activar ? 'btn' : 'btn o', type: 'button', text: activar ? 'Activar' : 'Pausar',
            on: { click: () => this.accion(() => cambiarEstado(r.id, activar ? 'Activo' : 'Pausado'), activar ? 'Regla activada' : 'Regla pausada') } }),
          h('button', { class: 'btn o', type: 'button', text: 'Probar regla', on: { click: () => { const x = probar(r.id); if (!x.ok) return toast(x.error);
            toast(`Prueba simulada: ${x.nuevos} nuevo${x.nuevos === 1 ? '' : 's'}, ${x.repetidos} ya registrado${x.repetidos === 1 ? '' : 's'}${x.omitidas ? `, ${x.omitidas} omitido${x.omitidas > 1 ? 's' : ''}` : ''}`); this.update(); } } }),
          h('button', { class: 'btn o', type: 'button', text: 'Eliminar', disabled: r.estado === 'Activo', title: r.estado === 'Activo' ? 'Pausa la regla antes de eliminarla' : null,
            on: { click: () => { if (!confirm(`¿Eliminar la regla “${r.nombre}”?`)) return; const x = eliminar(r.id); if (!x.ok) return toast(x.error); toast('Regla eliminada'); this.sel = getReglas()[0]?.id ?? null; this.update(); } } })),
        h('p', { class: 'muted small', text: `Ejecuciones simuladas registradas: ${ejecucionesDe(r.id)}` })));
  }

  /** El input del asistente conserva el foco: solo se repintan chips, mensaje y botón */
  paintAsistente(){
    const x = this.interp = interpretar(this.texto);
    this.$chips.replaceChildren(...(x.ok ? x.chips.map(c => h('span', { class: 'chip', text: c })) : []));
    this.$msg.textContent = x.ok ? 'La regla se crea como borrador: revísala y actívala.' : x.error;
    this.$crear.disabled = !x.ok;
  }
  crearIA(){
    if (!this.interp?.ok) return;
    const r = crear(this.interp.regla);
    if (!r.ok) return toast(r.error);
    this.sel = r.regla.id; toast('Regla creada en borrador: revísala y actívala'); this.update();
  }
  asistente(){
    this.$chips = h('div', { class: 'chips', aria: { live: 'polite' } });
    this.$msg = h('p', { class: 'muted small' });
    this.$crear = h('button', { class: 'btn block', type: 'button', text: 'Crear regla con IA', on: { click: () => this.crearIA() } });
    const sec = h('section', { class: 'card asist', aria: { labelledby: 'as-h' } },
      h('h2', { class: 'h', id: 'as-h' }, h('span', { class: 'lft' }, icon('sparkles', 18), ' Asistente de reglas')),
      h('label', { class: 'sr-only', for: 'as-t', text: 'Describe la regla' }),
      h('input', { id: 'as-t', class: 'field', type: 'text', maxlength: '200', autocomplete: 'off', value: this.texto, on: { input: e => { this.texto = e.target.value; this.paintAsistente(); } } }),
      this.$chips, this.$msg, this.$crear);
    this.paintAsistente();
    return sec;
  }
  lista(){
    const reglas = getReglas();
    const rows = reglas.map(r => ruleItem({ id: r.id, nombre: r.nombre, estado: r.estado, selected: r.id === this.sel,
      onSelect: () => { this.sel = r.id; this.update(); this.focusBy('id', r.id); } }));
    return h('section', { class: 'card', aria: { labelledby: 'mr-h' } },
      h('div', { class: 'h' }, h('h2', { id: 'mr-h', style: { font: 'inherit', margin: '0' }, text: 'Mis reglas' }), h('span', { class: 'badge', text: String(reglas.length) })),
      reglas.length ? h('ul', { class: 'reglas' }, frag(rows)) : h('p', { class: 'muted', text: 'Todavía no tienes reglas.' }));
  }

  dlgNueva(opener){
    const fld = (id, l, el) => h('div', { class: 'fld' }, h('label', { for: id, text: l }), el);
    const opts = obj => Object.entries(obj).map(([v, o]) => h('option', { value: v, text: o.texto }));
    const nombre = h('input', { id: 'nr-n', class: 'field', type: 'text', maxlength: '60', autocomplete: 'off' });
    const cu = h('select', { id: 'nr-c', class: 'field' }, ...opts(CUANDO)), si = h('select', { id: 'nr-s', class: 'field' }, ...opts(SI)), en = h('select', { id: 'nr-e', class: 'field' }, ...opts(ENTONCES));
    const pa = h('div', { class: 'fld' }), pl = h('select', { id: 'nr-l', class: 'field' });
    let pEl = null;
    const pintaParam = () => { const p = CUANDO[cu.value].param; if (!p){ pEl = null; pa.replaceChildren(); return; }
      pEl = p.opciones ? h('select', { id: 'nr-p', class: 'field' }, ...p.opciones.map(o => h('option', { value: String(o), text: String(o) }))) : h('input', { id: 'nr-p', class: 'field', type: 'number', min: p.min, max: p.max });
      pEl.value = String(p.def); pa.replaceChildren(h('label', { for: 'nr-p', text: p.etiqueta }), pEl); };
    const pintaPlantilla = () => pl.replaceChildren(...ENTONCES[en.value].plantillas.map(x => h('option', { value: x, text: x })));
    cu.addEventListener('change', pintaParam); en.addEventListener('change', pintaPlantilla); pintaParam(); pintaPlantilla();
    this.dialog('Nueva regla', [fld('nr-n', 'Nombre', nombre), fld('nr-c', 'CUANDO', cu), pa, fld('nr-s', 'SI', si), fld('nr-e', 'ENTONCES', en), fld('nr-l', 'Plantilla', pl)], () => {
      const r = crear({ nombre: nombre.value, cuando: { tipo: cu.value, n: pEl ? pEl.value : undefined }, si: { tipo: si.value }, entonces: { tipo: en.value, plantilla: pl.value } });
      if (!r.ok) return r.error;
      this.sel = r.regla.id; this.update(); toast('Regla creada en borrador'); return null;
    }, opener);
  }

  render(){
    return h('div', { class: 'auto' },
      h('header', { class: 'page-h' }, h('div', {}, h('h1', { text: 'Automatizaciones' }), h('p', { text: 'Lienzo de reglas' })),
        h('button', { class: 'btn', type: 'button', on: { click: e => this.dlgNueva(e.currentTarget) } }, icon('plus', 16), ' Nueva regla')),
      this.canvas(),
      h('div', { class: 'g t2' }, this.asistente(), this.lista()));
  }
}
