import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { DIRECTORIO, HORAS_CITA, HOY } from '../../../core/db/data.js';
import { icon } from '../../../shared/utils/icons.js';
import { addDias, lunesDe, rangoSemana, largo, hora12 } from '../../../shared/utils/dates.js';
import { h, toast } from '../../../shared/utils/dom.js';
import { semanaNode, navSemana } from '../components/weekCalendar.js';
import { getCitas, agendar, confirmar, cancelar, guardarActa } from '../services/citas.js';

const TONO = { Pendiente: 'w', Confirmada: 'g', Realizada: 's', Cancelada: 'x' };
const emp = id => DIRECTORIO.find(e => e.id === id)?.nombre ?? '—';

/** P7 · Agenda · Asesorías (Docente): citas de la semana y acta de la cita seleccionada. */
export class AdvisoriesView extends CdeView {
  semana = null; sel = null;
  bind(){
    const citas = getCitas().filter(c => c.fecha >= HOY).sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.semana = lunesDe(citas[0]?.fecha ?? HOY);
    this.sel = (getCitas().find(c => lunesDe(c.fecha) === this.semana && c.estado === 'Realizada') ?? getCitas().find(c => lunesDe(c.fecha) === this.semana))?.id ?? null;
  }
  get cita(){ return getCitas().find(c => c.id === this.sel) ?? null; }
  ir(n){ this.semana = addDias(this.semana, n * 7); this.sel = null; this.update(); }

  accion(fn, ok){ const r = fn(); if (!r.ok){ toast(r.error); return; } toast(ok); this.update(); }
  dlgAgendar(opener){
    const e = h('select', { id: 'ag-e', class: 'field' }, h('option', { value: '', text: 'Selecciona una empresa' }), ...DIRECTORIO.filter(x => !x.dupDe).map(x => h('option', { value: x.id, text: x.nombre })));
    const t = h('input', { id: 'ag-t', class: 'field', type: 'text', maxlength: '40', autocomplete: 'off' });
    const f = h('input', { id: 'ag-f', class: 'field', type: 'date', min: HOY });
    const hr = h('select', { id: 'ag-h', class: 'field' }, ...HORAS_CITA.map(x => h('option', { value: x, text: hora12(x) })));
    const fld = (id, l, el) => h('div', { class: 'fld' }, h('label', { for: id, text: l }), el);
    this.dialog('Agendar asesoría', [fld('ag-e', 'Empresa', e), fld('ag-t', 'Tema', t), fld('ag-f', 'Fecha', f), fld('ag-h', 'Hora', hr)], () => {
      const r = agendar({ empresaId: e.value, tema: t.value, fecha: f.value, hora: hr.value });
      if (!r.ok) return r.error;
      this.semana = lunesDe(f.value); this.sel = r.id; this.update(); toast('Cita agendada como pendiente'); return null;
    }, opener);
  }

  actaPanel(){
    const c = this.cita;
    if (!c) return h('section', { class: 'card acta' }, h('h2', { class: 'h', text: 'Acta de la cita' }), h('p', { class: 'muted', text: 'Selecciona una cita del calendario para registrar su acta.' }));
    const ac = h('textarea', { id: 'ac', class: 'field', maxlength: '1000', rows: '5', placeholder: 'Registra los acuerdos de la asesoría…', value: c.acta?.acuerdos ?? '' });
    const ps = h('textarea', { id: 'ps', class: 'field', maxlength: '300', rows: '2', placeholder: 'Compromiso y fecha', value: c.acta?.proximo ?? '' });
    const editable = c.estado === 'Confirmada' || c.estado === 'Realizada';
    const cuerpo = editable ? [
      h('div', { class: 'fld' }, h('label', { for: 'ac', text: 'Acuerdos' }), ac),
      h('div', { class: 'fld' }, h('label', { for: 'ps', text: 'Próximo paso' }), ps),
      h('div', { class: 'acta-acts' },
        h('button', { class: 'btn', type: 'button', text: 'Guardar acta', on: { click: () => this.accion(() => guardarActa(c.id, { acuerdos: ac.value, proximo: ps.value }), 'Acta guardada · cita realizada') } }),
        c.estado === 'Confirmada' ? h('button', { class: 'btn o', type: 'button', text: 'Cancelar cita', on: { click: () => { if (confirm(`¿Cancelar la cita con “${emp(c.empresaId)}”?`)) this.accion(() => cancelar(c.id), 'Cita cancelada'); } } }) : null)]
      : c.estado === 'Pendiente' ? [h('p', { class: 'muted', text: 'Confirma la cita para poder registrar el acta.' }),
          h('div', { class: 'acta-acts' }, h('button', { class: 'btn', type: 'button', text: 'Confirmar cita', on: { click: () => this.accion(() => confirmar(c.id), 'Cita confirmada') } }),
            h('button', { class: 'btn o', type: 'button', text: 'Cancelar cita', on: { click: () => { if (confirm(`¿Cancelar la cita con “${emp(c.empresaId)}”?`)) this.accion(() => cancelar(c.id), 'Cita cancelada'); } } }))]
      : [h('p', { class: 'muted', text: 'Esta cita fue cancelada; no admite acta.' })];
    return h('section', { class: 'card acta', aria: { labelledby: 'ac-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'ac-t', style: { font: 'inherit', margin: '0' }, text: 'Acta de la cita' }), statusBadge(c.estado)),
      h('div', {}, h('b', { text: `${emp(c.empresaId)} · ${c.tema}` }), h('p', { class: 'muted', text: `${largo(c.fecha)} · ${hora12(c.hora)}` })), ...cuerpo);
  }

  render(){
    const l = this.semana;
    const items = getCitas().map(c => ({ id: c.id, fecha: c.fecha, hora: c.hora, titulo: emp(c.empresaId), sub: `${c.tema} · ${c.estado}`, tono: TONO[c.estado], pressed: c.id === this.sel,
      onClick: () => { this.sel = c.id; this.update(); this.focusBy('id', c.id); } }));
    return h('div', { class: 'agenda' },
      h('header', { class: 'page-h' }, h('div', {}, h('h1', { text: 'Agenda · Asesorías' }), h('p', { text: `Citas de la semana · ${rangoSemana(l)}` })),
        h('button', { class: 'btn', type: 'button', on: { click: e => this.dlgAgendar(e.currentTarget) } }, icon('plus', 16), ' Agendar')),
      h('div', { class: 'as-grid' },
        h('section', { class: 'card', aria: { labelledby: 'wk-t' } },
          navSemana('Citas de la semana', 'wk-t', () => { this.ir(-1); this.querySelector('[aria-label="Semana anterior"]')?.focus(); }, () => { this.ir(1); this.querySelector('[aria-label="Semana siguiente"]')?.focus(); }),
          h('div', { class: 'chips leyenda', role: 'group', aria: { label: 'Leyenda de estados' } }, ['Pendiente', 'Confirmada', 'Realizada', 'Cancelada'].map(s => statusBadge(s))),
          semanaNode(l, items, `Citas de la semana del ${rangoSemana(l)}`)),
        this.actaPanel()));
  }
}
